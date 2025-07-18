import {
  handleRankedStart,
  handleRankedInput,
  handleRankedStop,
  handleRankedStopLobby,
  cleanupRankedSocket,
  getLeaderboard,
  socketToRankedSession,
  handleRankedForfeit,
} from "../websocket/handlers/tournament";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ethers } from "ethers";
import { postScore, fetchScores } from "../blockchain";
import { db } from "../db/db";

// ─────────────────────────────────────────────────────────────────────────────
// HTTP API: on-chain scores
// ─────────────────────────────────────────────────────────────────────────────
export default async function scoresRoutes(app: FastifyInstance) {
  app.post(
    "/scores",
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

        const txHash = await postScore(gameId, normalizedAddress, score, user.sub);
        reply.send({ txHash });
      } catch (err: any) {
        console.error("POST /api/scores error:", err);
        const message = err instanceof Error ? err.message : "Internal error";
        reply.status(500).send({ error: message });
      }
    }
  );

  app.get(
    "/scores/:gameId",
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
  // Tournament/Ranked API endpoints
  // ─────────────────────────────────────────────────────────────────────────────
  app.get(
    "/leaderboard",
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
  app.get("/test-token", async (req, reply) => {
    try {
      // Create a test JWT token for user ID 1
      const testUser = { sub: 1, userName: "testUser" };
      const token = app.jwt.sign(testUser);

      // Set the cookie like your OAuth does
      reply.setCookie("token", token, {
        httpOnly: true,
        secure: false, 
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

  // Get transactions endpoint
  app.get(
    "/transactions",
    {
      preHandler: [(app as any).authenticate],
    },
    async (req, reply) => {
      try {
        const user = req.user as { sub: number; userName: string };
        const page = parseInt((req.query as any).page) || 1;
        const limit = parseInt((req.query as any).limit) || 100;
        const offset = (page - 1) * limit;

        console.log(`Fetching ALL transactions (requested by user ${user.userName})`);

        const rows = await new Promise<any[]>((resolve, reject) => {
          db.all(
            `SELECT t.*, u.userName 
             FROM \`Transaction\` t
             LEFT JOIN User u ON t.userId = u.idUser
             ORDER BY t.timestamp DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        console.log(`Found ${rows.length} total transactions`);
        reply.send(rows);
      } catch (err) {
        console.error("GET /api/transactions error:", err);
        reply.status(500).send({ error: "Internal error" });
      }
    }
  );

  // Add a test endpoint with better error reporting
  app.post("/test-scores-working", async (req, reply) => {
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
}
