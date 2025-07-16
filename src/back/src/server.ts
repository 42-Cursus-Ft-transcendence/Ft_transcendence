import type {
  FastifyLoggerOptions,
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import type { WebSocket } from "@fastify/websocket";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import oauthPlugin from "@fastify/oauth2";

dotenv.config({ path: path.resolve(__dirname, "../.env.backend") });
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import { ethers } from "ethers";

import { postScore, fetchScores } from "./blockchain";
import {
  handleRankedStart,
  handleRankedInput,
  handleRankedStop,
  handleRankedStopLobby,
  cleanupRankedSocket,
  getLeaderboard,
  socketToRankedSession,
  handleRankedForfeit,
} from "./tournament";
import "./db/db"; // ← initialise la BD et les tables
import { db } from "./db/db";

// Import new handlers
import { handleOnlineStart, cleanupOnlineSocket } from "./online";
import { handleAIStart, handleLocalStart, cleanupLocalGame } from "./ai";
import { handleInput } from "./input";
import { handleStop } from "./stop";
import { handleStopLobby } from "./stoplobby";
import { handleForfeit } from "./forfeit";
import userRoutes from "./routes/userRoutes";
import oauthRoutes from "./routes/oauthRoute";
import twofaRoutes from "./routes/twofaRoutes";

// Import plugins
import loggerPlugin, { loggerOptions } from "./plugins/logger";
import authPlugin from "./plugins/auth";
//import { verifyPre2fa } from "./plugins/verifyPre2fa";

(async () => {
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Create Fastify + register WebSocket plugin
  // ─────────────────────────────────────────────────────────────────────────────

  const environment =
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "development";
  const isDev = environment === "development";

  const app = Fastify({
    logger: loggerOptions[environment],
    disableRequestLogging: true,
  });
  app.register(loggerPlugin);

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

  await app.register(authPlugin);

  // bd routes
  app.register(userRoutes, { prefix: "/api" });
  app.register(oauthRoutes, { prefix: "/api" });
  app.register(twofaRoutes, { prefix: "/api" });

  // Register WebSocket plugin without any options
  app.register(fastifyWebsocket);
  console.log("WebSocket plugin registered");

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
            // 1) START: decide online vs bot vs local vs ranked
            case "start":
              if (msg.vs === "ranked") {
                await handleRankedStart(socket, payload);
                return;
              }
              if (msg.vs === "online") {
                handleOnlineStart(socket, payload);
                return;
              }
              if (msg.vs === "bot") {
                handleAIStart(socket, msg.difficulty);
                return;
              }
              // Default to local player mode
              handleLocalStart(socket);
              return;

            // 2) INPUT: route to the correct game instance
            case "input":
              handleInput(socket, msg);
              return;

            // 3) STOP: tear down the correct session and save scores
            case "stop":
              await handleStop(socket);
              return;

            case "stoplobby":
              handleStopLobby(socket, msg);
              return;

            case "forfeit":
              await handleForfeit(socket);
              return;

            default:
              return socket.send(
                JSON.stringify({
                  type: "error",
                  message: "Unknown message type",
                })
              );
          }
        });

        socket.on("close", async () => {
          // Clean up all types of sessions/games
          cleanupOnlineSocket(socket);
          cleanupLocalGame(socket);
          await cleanupRankedSocket(socket);

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
    {
      preHandler: [(app as any).authenticate], // Add authentication
    },
    async (
      req: FastifyRequest<{
        Body: { gameId: string; player: string; score: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Now you can access authenticated user info
        const user = req.user as { sub: number; userName: string };
        console.log(
          `Authenticated user: ${user.userName} (ID: ${user.sub}) posting score`
        );

        const { gameId, player, score } = req.body as {
          gameId: string;
          player: string;
          score: number;
        };

        // Validate and normalize Ethereum address
        const validateAndNormalizeAddress = (addr: string): string | null => {
          if (typeof addr !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
            return null;
          }
          try {
            // Convert to lowercase first to bypass strict checksum validation, then normalize
            const lowercaseAddr = addr.toLowerCase();
            return ethers.getAddress(lowercaseAddr);
          } catch {
            return null;
          }
        };

        const normalizedAddress = validateAndNormalizeAddress(player);

        if (!gameId || !normalizedAddress || typeof score !== "number") {
          return reply.status(400).send({
            error: "Invalid payload",
            details: {
              gameId: !gameId ? "missing" : "ok",
              player: !normalizedAddress
                ? "invalid address format or checksum"
                : "ok",
              score: typeof score !== "number" ? "must be number" : "ok",
            },
          });
        }

        const txHash = await postScore(gameId, normalizedAddress, score);
        reply.send({ txHash });
      } catch (err: any) {
        console.error("POST /api/scores error:", err);
        const message = err instanceof Error ? err.message : "Internal error";
        reply.status(500).send({ error: message });
      }
    }
  );

  app.get(
    "/api/scores/:gameId",
    {
      preHandler: [(app as any).authenticate], // Add authentication
    },
    async (req, reply) => {
      try {
        const user = req.user as { sub: number; userName: string };
        console.log(
          `Authenticated user: ${user.userName} requesting scores for game`
        );
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
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Blockchain Explorer API endpoints
  // ─────────────────────────────────────────────────────────────────────────────
  app.get(
    "/api/transactions",
    {
      preHandler: [(app as any).authenticate],
    },
    async (req, reply) => {
      try {
        const user = req.user as { sub: number; userName: string };
        const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };
        const offset = (page - 1) * limit;
        
        // Get transactions with pagination
        const transactions = await new Promise<any[]>((resolve, reject) => {
          db.all(
            `SELECT * FROM Transaction 
             ORDER BY timestamp DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });
        
        // Get total count for pagination
        const totalCount = await new Promise<number>((resolve, reject) => {
          db.get(
            "SELECT COUNT(*) as count FROM Transaction",
            (err, row: any) => {
              if (err) reject(err);
              else resolve(row.count);
            }
          );
        });
        
        reply.send({
          transactions,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        });
      } catch (err: unknown) {
        console.error("GET /api/transactions error:", err);
        const message = err instanceof Error ? err.message : "Internal error";
        reply.status(500).send({ error: message });
      }
    }
  );

  app.get(
    "/api/transactions/:hash",
    {
      preHandler: [(app as any).authenticate],
    },
    async (req, reply) => {
      try {
        const user = req.user as { sub: number; userName: string };
        const hash = (req.params as any).hash;
        
        const transaction = await new Promise<any>((resolve, reject) => {
          db.get(
            "SELECT * FROM Transaction WHERE hash = ?",
            [hash],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        
        if (!transaction) {
          return reply.status(404).send({ error: "Transaction not found" });
        }
        
        reply.send(transaction);
      } catch (err: unknown) {
        console.error("GET /api/transactions/:hash error:", err);
        const message = err instanceof Error ? err.message : "Internal error";
        reply.status(500).send({ error: message });
      }
    }
  );

  app.get(
    "/api/transactions/game/:gameId",
    {
      preHandler: [(app as any).authenticate],
    },
    async (req, reply) => {
      try {
        const user = req.user as { sub: number; userName: string };
        const gameId = (req.params as any).gameId;
        
        const transactions = await new Promise<any[]>((resolve, reject) => {
          db.all(
            "SELECT * FROM Transaction WHERE game_id = ? ORDER BY timestamp DESC",
            [gameId],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });
        
        reply.send(transactions);
      } catch (err: unknown) {
        console.error("GET /api/transactions/game/:gameId error:", err);
        const message = err instanceof Error ? err.message : "Internal error";
        reply.status(500).send({ error: message });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Tournament/Ranked API endpoints
  // ─────────────────────────────────────────────────────────────────────────────
  app.get(
    "/api/leaderboard",
    {
      preHandler: [(app as any).authenticate], // Add authentication
    },
    async (req, reply) => {
      try {
        // Now you can access authenticated user info
        const user = req.user as { sub: number; userName: string };
        console.log(
          `Authenticated user: ${user.userName} requesting leaderboard`
        );

        const limit = parseInt((req.query as any).limit) || 10;
        const leaderboard = await getLeaderboard(limit);
        reply.send(leaderboard);
      } catch (err: unknown) {
        console.error("GET /api/leaderboard error:", err);
        const message = err instanceof Error ? err.message : "Internal error";
        reply.status(500).send({ error: message });
      }
    }
  );

  // Add this TEMPORARY test endpoint right after your existing API routes
  app.get("/api/test-token", async (req, reply) => {
    try {
      // Create a test JWT token for user ID 1
      const testUser = { sub: 1, userName: "testUser" };
      const token = app.jwt.sign(testUser);

      // Set the cookie like your OAuth does
      reply.setCookie("token", token, {
        httpOnly: true,
        secure: false, // set to true in production with HTTPS
        sameSite: "lax",
        maxAge: 7200, // 2 hours
      });

      reply.send({
        message: "Test token set in cookie",
        token: token,
        user: testUser,
      });
    } catch (err) {
      reply.status(500).send({ error: "Failed to create test token" });
    }
  });

  // Add a test endpoint with better error reporting
  app.post("/api/test-scores-working", async (req, reply) => {
    try {
      console.log("Raw request body:", req.body);

      const { gameId, player, score } = req.body as any;

      // Manual address validation instead of ethers.isAddress()
      const isValidEthAddress = (addr: string): boolean => {
        return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);
      };

      console.log("Manual address validation:", isValidEthAddress(player));
      console.log("ethers.isAddress test:", ethers.isAddress(player));

      // Validation with manual check
      if (!gameId) {
        return reply.status(400).send({ error: "gameId is required" });
      }
      if (!isValidEthAddress(player)) {
        return reply.status(400).send({
          error: "player must be a valid Ethereum address (manual check)",
        });
      }
      if (typeof score !== "number") {
        return reply.status(400).send({ error: "score must be a number" });
      }

      reply.send({
        message: "✅ All validation passed!",
        received: { gameId, player, score },
        note: "Using manual address validation instead of ethers.isAddress()",
      });
    } catch (err: any) {
      console.error("Test endpoint error:", err);
      reply.status(500).send({ error: err.message });
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
  // Start server
  // ─────────────────────────────────────────────────────────────────────────────
  const PORT = Number(process.env.PORT) || 3000;
  await app.listen({ port: PORT, host: "0.0.0.0" });
  if (isDev) {
    console.log(
      `\x1b[32m🚀 [DEV] Server running at http://localhost:${PORT}\x1b[0m`
    );
  } else {
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
