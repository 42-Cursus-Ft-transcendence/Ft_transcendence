import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { WaitingItem, Session as MatchSession } from "./types/session";
import type { WebSocket } from "@fastify/websocket";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// 1) Load .env before anything else reads process.env
dotenv.config({ path: path.resolve(__dirname, "../.env.backend") });
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import { ethers } from "ethers";

import { postScore, fetchScores } from "./blockchain";
import Game, { startAI } from "./game";

import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import oauthPlugin from "@fastify/oauth2";
import userRoutes, { getAsync } from "./routes/userRoutes"; // ← import par défaut
import "./db/db"; // ← initialise la BD et les tables
import crypto from "crypto";
// ─────────────────────────────────────────────────────────────────────────────
// Determine frontend directory
// ─────────────────────────────────────────────────────────────────────────────
const prodDir = path.resolve(__dirname, "../public");
const devDir = path.resolve(__dirname, "../../../src/front/public");
let publicDir: string;

if (fs.existsSync(prodDir)) {
  publicDir = prodDir;
} else if (fs.existsSync(devDir)) {
  publicDir = devDir;
} else {
  console.error("❌ Frontend directory not found");
  process.exit(1);
}
console.log("⛳️ Serving static from:", publicDir);

//creation session pour queue et lobby

type Session = {
  id: string;
  game: Game;
  sockets: { p1: WebSocket; p2: WebSocket };
  players: {
    p1: { sub: number; userName: string };
    p2: { sub: number; userName: string };
  };
  loopTimer: NodeJS.Timeout;
};
const waiting: WaitingItem[] = [];
const sessions = new Map<string, MatchSession>();
const socketToSession = new Map<WebSocket, Session>();

// ─────────────────────────────────────────────────────────────────────────────
// Create Fastify + register WebSocket plugin
// ─────────────────────────────────────────────────────────────────────────────
const app = Fastify();
console.log("Fastify instance created");

// cookie

app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || "une_autre_chaine_complexe", // signe/encrypte les cookies
  parseOptions: {},
});

// JWT
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "une_chaine_tres_complexe",
  cookie: {
    cookieName: "token", // le nom exact de ton cookie
    signed: false, // true si tu utilises la signature de fastify-cookie
  },
  sign: {
    expiresIn: "2h",
  },
});

// OAuth2
app.register(oauthPlugin, {
  name: "googleOAuth2",
  scope: ["profile", "email"],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID!,
      secret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    auth: oauthPlugin.GOOGLE_CONFIGURATION,
  },
  startRedirectPath: "/api/login/google", // 인증 시작 URL
  callbackUri: process.env.GOOGLE_CALLBACK_URL!, // 인증 후 callback URL
  callbackUriParams: {
    // callbackUri에 추가할 custom query 파라미터
    access_type: "offline", // refresh token도 받기 위해 'offline' 모드를 요청
  },
  pkce: "S256",
});

app.decorate(
  "authenticate",
  async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    console.log("Cookies reçus:", request.cookies);
    console.log("Authorization header:", request.headers.authorization);
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: (err as Error).message,
      });
    }
  }
);

// bd routes
app.register(userRoutes);

// Register WebSocket plugin without any options
app.register(fastifyWebsocket);
console.log("WebSocket plugin registered");

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket endpoint: /ws
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// WebSocket endpoint: /ws (with online matchmaking + bot + local play)
// ─────────────────────────────────────────────────────────────────────────────
app.register(async (fastify: FastifyInstance) => {
  fastify.get(
    "/ws",
    {
      websocket: true,
      preHandler: [(fastify as any).authenticate],
    },
    (socket: WebSocket, request: FastifyRequest) => {
      const payload = request.user as { sub: number; userName: string };
      console.log(`✅ WS client connected: user #${payload.userName}`);

      let localGame = new Game();
      let localLoop: NodeJS.Timeout | undefined;
      let localAI: NodeJS.Timeout | undefined;

      socket.on("message", async (raw: Buffer) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
          console.log(msg);
        } catch {
          return socket.send(
            JSON.stringify({ type: "error", message: "Invalid JSON" })
          );
        }

        switch (msg.type) {
          // 1) START: decide online vs bot vs local
          case "start":
            if (msg.vs === "online") {
              if (waiting.length > 0) {
                const opponent = waiting.shift()!;
                const p1 = opponent.payload;
                const p2 = payload;
                const gameId = crypto.randomUUID();
                const sessionGame = new Game();
                sessionGame.mode = "online";

                const loopTimer = setInterval(() => {
                  sessionGame.update();
                  const state = JSON.stringify(sessionGame.getState());
                  opponent.socket.send(state);
                  socket.send(state);
                }, 1000 / 60);

                const session: Session = {
                  id: gameId,
                  game: sessionGame,
                  sockets: { p1: opponent.socket, p2: socket },
                  players: { p1, p2 },
                  loopTimer,
                };
                sessions.set(gameId, session);
                socketToSession.set(opponent.socket, session);
                socketToSession.set(socket, session);

                opponent.socket.send(
                  JSON.stringify({ type: "matchFound", gameId, youAre: "p1" })
                );
                socket.send(
                  JSON.stringify({ type: "matchFound", gameId, youAre: "p2" })
                );
              } else {
                waiting.push({ socket, payload });
                socket.send(JSON.stringify({ type: "waiting" }));
              }
              return;
            }
            // BOT or LOCAL PLAYER
            localGame = new Game();
            localLoop = setInterval(() => {
              localGame.update();
              socket.send(JSON.stringify(localGame.getState()));
            }, 1000 / 60);

            if (msg.vs === "bot") {
              localGame.mode = "bot";
              const diff = parseFloat(msg.difficulty) || 0;
              localAI = startAI(localGame, 1);
            }
            return;

          // 2) INPUT: route to the correct game instance
          case "input": {
            const sess = socketToSession.get(socket);
            if (sess) {
              const who = socket === sess.sockets.p1 ? "p1" : "p2";
              sess.game.applyInput(who, msg.dir);
              return;
            }
            const ply = msg.player === "p2" ? "p2" : "p1";
            if (ply === "p2" && localGame.mode !== "player") return;
            localGame.applyInput(ply, msg.dir);
            return;
          }
          // 3) STOP: tear down the correct session and save scores
          case "stop": {
            const sess = socketToSession.get(socket);
            if (sess) {
              clearInterval(sess.loopTimer);
              sess.sockets.p1.send(
                JSON.stringify({
                  type: "STOP",
                  score1: sess.game.score[0],
                  score2: sess.game.score[1],
                })
              );
              sess.sockets.p2.send(JSON.stringify({ type: "STOP" }));
              sessions.delete(sess.id);
              socketToSession.delete(sess.sockets.p1);
              socketToSession.delete(sess.sockets.p2);
              const row1 = await getAsync<{ address: string }>(
                `SELECT address FROM User WHERE idUser = ?`,
                [sess.players.p1.sub]
              );
              const row2 = await getAsync<{ address: string }>(
                `SELECT address FROM User WHERE idUser = ?`,
                [sess.players.p2.sub]
              );
              if (!row1 || !row2) {
                console.error(
                  "Missing on-chain address for one of the players"
                );
              } else {
                // 3) Post both scores on-chain
                console.log("blockchain posting");
                try {
                  const tx1 = await postScore(
                    sess.id,
                    row1.address,
                    sess.game.score[0]
                  );
                  const tx2 = await postScore(
                    sess.id,
                    row2.address,
                    sess.game.score[1]
                  );
                  console.log("Scores posted:", tx1, tx2);
                } catch (err) {
                  console.error("postScore failed:", err);
                }
              }
              const result = JSON.stringify({
                type: "matchOver",
                gameId: sess.id,
                score: sess.game.score,
              });
              // sess.sockets.p1.send(result);
              // sess.sockets.p2.send(result);
              return;
            }
            console.log("Game over, saving local scores");
            if (localLoop) {
              clearInterval(localLoop);
              localLoop = undefined;
            }
            if (localAI) {
              clearInterval(localAI);
              localAI = undefined;
            }

            // TODO: post localGame.score on–chain here…
            return;
          }
          case "stoplobby":
            {
              // Rebuild the array without the one you want to drop
              let item = waiting.findIndex((w) => w.socket === socket);
              if (item >= 0) waiting.splice(item, 1);
            }
            return;
          default:
            return socket.send(
              JSON.stringify({ type: "error", message: "Unknown message type" })
            );
        }
      });

      socket.on("close", () => {
        const idx = waiting.findIndex((w) => w.socket === socket);
        if (idx >= 0) waiting.splice(idx, 1);

        const sess = socketToSession.get(socket);
        if (sess) {
          clearInterval(sess.loopTimer);
          sessions.delete(sess.id);
          socketToSession.delete(sess.sockets.p1);
          socketToSession.delete(sess.sockets.p2);
        }

        if (localLoop) clearInterval(localLoop);
        if (localAI) clearInterval(localAI);

        console.log("⚠️ WS client disconnected");
      });
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP API: on-chain scores
// ─────────────────────────────────────────────────────────────────────────────
app.post(
  "/api/scores",
  async (
    req: FastifyRequest<{
      Body: { gameId: string; player: string; score: number };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { gameId, player, score } = req.body as {
        gameId: string;
        player: string;
        score: number;
      };
      if (!gameId || !ethers.isAddress(player) || typeof score !== "number") {
        return reply.status(400).send({ error: "Invalid payload" });
      }
      const txHash = await postScore(gameId, player, score);
      reply.send({ txHash });
    } catch (err: any) {
      console.error("POST /api/scores error:", err);
      const message = err instanceof Error ? err.message : "Internal error";
      reply.status(500).send({ error: message });
    }
  }
);

app.get("/api/scores/:gameId", async (req, reply) => {
  try {
    const gameId = (req.params as any).gameId;
    console.log(gameId);
    const scores = await fetchScores(gameId);
    reply.send(scores);
  } catch (err: unknown) {
    console.error("GET /api/scores error:", err);
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else {
      message = "Internal error";
    }
    reply.status(500).send({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Serve static frontend & SPA fallback (excluding /ws & /api)
// ─────────────────────────────────────────────────────────────────────────────
app.register(fastifyStatic, {
  root: publicDir,
  prefix: "/",
  index: ["index.html"],
  wildcard: false,
});

app.get("/favicon.ico", (_req, reply) => {
  const ico = path.join(publicDir, "favicon.ico");
  if (fs.existsSync(ico)) {
    reply.header("Content-Type", "image/x-icon").send(fs.readFileSync(ico));
  } else {
    reply.code(204).send();
  }
});

app.setNotFoundHandler((req, reply) => {
  const url = req.raw.url || "";
  // let /ws handshake and /api pass through
  if (url.startsWith("/ws") || url.startsWith("/api")) {
    return reply.callNotFound();
  }
  reply.sendFile("index.html");
});

// ─────────────────────────────────────────────────────────────────────────────
// SQLite for local logging (optional)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
app
  .listen({ port: PORT, host: "0.0.0.0" })
  .then(() => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
