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

import type { FastifyRequest, FastifyReply } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import userRoutes from './db/userRoutes'   // ← import par défaut
import './db/db'                           // ← initialise la BD et les tables
import {getAsync} from './db/userRoutes'
import {createGame} from './db/userRoutes'
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



// cookie

app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || 'une_autre_chaine_complexe', // signe/encrypte les cookies
  parseOptions: {}
})

// JWT 
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'une_chaine_tres_complexe',
  cookie: {
    cookieName: 'token',   // le nom exact de ton cookie
    signed:     false      // true si tu utilises la signature de fastify-cookie
  },
  sign: {
    expiresIn: '2h'
  }
})

app.decorate("authenticate", async function (request:FastifyRequest, reply:FastifyReply) : Promise<void>  {
   console.log('Cookies reçus:', request.cookies)
   console.log('Authorization header:', request.headers.authorization)  
  try 
    {
      await request.jwtVerify();
    } 
    catch (err) 
    {
      reply.send(err);  
    }
})




// bd routes 
app.register(userRoutes);

// Register WebSocket plugin without any options
app.register(fastifyWebsocket);
console.log("WebSocket plugin registered");

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket endpoint: /ws
// ─────────────────────────────────────────────────────────────────────────────
app.register(async fastify => {
  fastify.get("/ws", { websocket: true,preHandler:[(fastify as any).authenticate] }, (socket, _req) => {
    console.log("WS client connected");
    
    // Note: directly using socket instead of connection.socket
    let game = new Game();
    let loopTimer: ReturnType<typeof setInterval> | undefined;
    let aiTimer: ReturnType<typeof setInterval> | undefined;
    const payload = _req.user as { sub: number; userName: string };
    socket.on("message", async(raw: Buffer) => {
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
          if (msg.vs === 'online')
          {
            
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
            let idp1 = payload.sub;
            let idp2 = await  getAsync<{
                id: number
            }>(`SELECT idUser FROM User WHERE userName = ?`,
                ['Jarvis']
            )
            let addy = await  getAsync<{
                address: string
            }>(`SELECT address FROM User WHERE userName = ?`,
                [payload.userName]
            )
            let idpp2 = 20;
            if (idp2)
                idpp2 = idp2.id;
            let gameId = await createGame(idp1,idpp2,game.score[0],game.score[1]);
            if (addy)
                await postScore(gameId.toString(),addy.address,game.score[0]);
            console.log(gameId);
            if (gameId && addy)        
            {
                try {
                const scores = await fetchScores(gameId.toString());
                console.log(scores[0].score);
                console.log(scores[0].player);
                console.log("All scores array:", scores);
                // if you want the first score:
                if (scores.length > 0) {
                    console.log("First player's score:", scores[0].score);
                }
                if (scores.length > 1) {
                    console.log("First player's score:", scores[1].score);
                }
                } catch (err) {
                console.log("fetchscore failed:", err);
}
            }
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
    console.log(gameId);
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