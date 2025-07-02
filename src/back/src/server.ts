import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// 1) Load .env before anything else reads process.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import sqlite3 from "sqlite3";
import { ethers } from "ethers";

import { postScore, fetchScores } from "./blockchain";
import Game, { startAI } from "./game";

// ─────────────────────────────────────────────────────────────────────────────
// Determine frontend directory
// ─────────────────────────────────────────────────────────────────────────────
const prodDir = path.resolve(__dirname, "../public");
const devDir  = path.resolve(__dirname, "../../../src/front/public");
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

// ─────────────────────────────────────────────────────────────────────────────
// Create Fastify + register WebSocket plugin
// ─────────────────────────────────────────────────────────────────────────────
const app = Fastify();
console.log("Fastify instance created");

// Register WebSocket plugin without any options
app.register(fastifyWebsocket);
console.log("WebSocket plugin registered");

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket endpoint: /ws
// ─────────────────────────────────────────────────────────────────────────────
app.register(async fastify => {
  fastify.get("/ws", { websocket: true }, (socket, _req) => {
    console.log("WS client connected");
    
    // Note: directly using socket instead of connection.socket

    let game = new Game();
    let loopTimer: ReturnType<typeof setInterval> | undefined;
    let aiTimer: ReturnType<typeof setInterval> | undefined;

    socket.on("message", (raw: Buffer) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        return;
      }

      switch (msg.type) {
        case "start":
          if (loopTimer) return;
          game = new Game();
          if (msg.vs === "bot") game.mode = "bot";
          loopTimer = setInterval(() => {
            game.update();
            socket.send(JSON.stringify(game.getState()));
          }, 1000 / 60);
          if (msg.vs === "bot") {
            const diff = parseFloat(msg.difficulty) || 0;
            aiTimer = startAI(game, diff);
          }
          break;

        case "input":
          {
            const ply = msg.player === "p2" ? "p2" : "p1";
            if (ply === "p2" && game.mode !== "player") return;
            game.applyInput(ply, msg.dir);
          }
          break;

        case "stop":
          console.log("Game over, saving scores");
          if (loopTimer) {
            clearInterval(loopTimer);
            loopTimer = undefined;
          }
          if (aiTimer) {
            clearInterval(aiTimer);
            aiTimer = undefined;
          }
          // extract and post both players' scores
          {
            const { gameId, p1Address, p2Address, score } = msg;
            const [s1, s2] = Array.isArray(score) ? score : [0, 0];
            postScore(gameId, p1Address, s1).catch((e: any) =>
              console.error("postScore p1 failed:", e)
            );
            postScore(gameId, p2Address, s2).catch((e: any) =>
              console.error("postScore p2 failed:", e)
            );
          }
          break;

        default:
          socket.send(
            JSON.stringify({ type: "error", message: "Unknown message type" })
          );
      }
    });

    socket.on("close", () => {
      if (loopTimer) clearInterval(loopTimer);
      if (aiTimer) clearInterval(aiTimer);
      console.log("WS client disconnected");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP API: on-chain scores
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/scores", async (req, reply) => {
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
  } catch (err: unknown) {
    console.error("POST /api/scores error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    reply.status(500).send({ error: message });
  }
});

app.get("/api/scores/:gameId", async (req, reply) => {
  try {
    const gameId = (req.params as any).gameId;
    const scores = await fetchScores(gameId);
    reply.send(scores);
  } catch (err: unknown) {
    console.error("GET /api/scores error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
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
    reply
      .header("Content-Type", "image/x-icon")
      .send(fs.readFileSync(ico));
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
const dbPath = path.resolve(
  __dirname,
  process.env.DB_PATH || "../data/db.sqlite"
);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath, (err) =>
  err ? console.error(err) : console.log("✅ SQLite ready")
);
db.run(
  `CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY,
    gameId TEXT,
    player TEXT,
    score INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);

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