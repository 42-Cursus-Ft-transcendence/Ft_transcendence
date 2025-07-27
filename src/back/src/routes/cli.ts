import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import Game, { startAI } from "../websocket/handlers/game";
import { createGame } from "./userRoutes";

// Store active CLI games per user
interface CLIGameSession {
  game: Game;
  gameId: string;
  isActive: boolean;
  aiInterval?: ReturnType<typeof setInterval>;
  createdAt: Date;
  lastUpdate: Date;
}

const cliGames = new Map<number, CLIGameSession>();

// Cleanup inactive games after 30 minutes
setInterval(() => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  for (const [userId, session] of cliGames.entries()) {
    if (session.lastUpdate < thirtyMinutesAgo) {
      if (session.aiInterval) {
        clearInterval(session.aiInterval);
      }
      cliGames.delete(userId);
      console.log(`Cleaned up inactive CLI game for user ${userId}`);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

export default async function cliRoutes(app: FastifyInstance) {
  // Initialize a new CLI game
  app.post(
    "/cli/game/init",
    { preHandler: [(app as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as any).sub as number;
        const { mode, difficulty, maxScore } = request.body as {
          mode?: 'player' | 'bot';
          difficulty?: number;
          maxScore?: number;
        };

        // Clean up any existing game for this user
        const existingSession = cliGames.get(userId);
        if (existingSession?.aiInterval) {
          clearInterval(existingSession.aiInterval);
        }

        // Create new game
        const game = new Game();
        game.mode = mode || 'player';
        if (maxScore && maxScore > 0) {
          game.setMaxScore(maxScore);
        }

        const gameId = `cli_${userId}_${Date.now()}`;
        const session: CLIGameSession = {
          game,
          gameId,
          isActive: true,
          createdAt: new Date(),
          lastUpdate: new Date()
        };

        // Start AI if bot mode
        if (mode === 'bot') {
          const aiDifficulty = Math.max(0, Math.min(1, difficulty || 0.5));
          session.aiInterval = startAI(game, aiDifficulty);
        }

        cliGames.set(userId, session);

        return reply.status(201).send({
          gameId,
          mode: game.mode,
          maxScore: game.maxScore,
          state: game.getState(),
          message: "Game initialized successfully"
        });

      } catch (error: any) {
        console.error("CLI game init error:", error);
        return reply.status(500).send({ error: "Failed to initialize game" });
      }
    }
  );

  // Get current game state
  app.get(
    "/cli/game/:gameId/state",
    { preHandler: [(app as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as any).sub as number;
        const { gameId } = request.params as { gameId: string };

        const session = cliGames.get(userId);
        if (!session || session.gameId !== gameId) {
          return reply.status(404).send({ error: "Game not found" });
        }

        session.lastUpdate = new Date();

        return reply.status(200).send({
          gameId: session.gameId,
          state: session.game.getState(),
          isActive: session.isActive,
          mode: session.game.mode
        });

      } catch (error: any) {
        console.error("CLI game state error:", error);
        return reply.status(500).send({ error: "Failed to get game state" });
      }
    }
  );

  // Apply player input
  app.post(
    "/cli/game/:gameId/input",
    { preHandler: [(app as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as any).sub as number;
        const { gameId } = request.params as { gameId: string };
        const { player, action } = request.body as {
          player: 'p1' | 'p2';
          action: 'up' | 'down' | 'stop';
        };

        const session = cliGames.get(userId);
        if (!session || session.gameId !== gameId) {
          return reply.status(404).send({ error: "Game not found" });
        }

        if (!session.isActive) {
          return reply.status(400).send({ error: "Game is not active" });
        }

        if (!['p1', 'p2'].includes(player)) {
          return reply.status(400).send({ error: "Player must be 'p1' or 'p2'" });
        }

        if (!['up', 'down', 'stop'].includes(action)) {
          return reply.status(400).send({ error: "Action must be 'up', 'down', or 'stop'" });
        }

        // In bot mode, only allow p1 input
        if (session.game.mode === 'bot' && player !== 'p1') {
          return reply.status(400).send({ error: "In bot mode, only p1 input is allowed" });
        }

        session.game.applyInput(player, action);
        session.lastUpdate = new Date();

        return reply.status(200).send({
          gameId: session.gameId,
          player,
          action,
          state: session.game.getState(),
          message: "Input applied successfully"
        });

      } catch (error: any) {
        console.error("CLI game input error:", error);
        return reply.status(500).send({ error: "Failed to apply input" });
      }
    }
  );

  // Update game (advance by one tick)
  app.post(
    "/cli/game/:gameId/update",
    { preHandler: [(app as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as any).sub as number;
        const { gameId } = request.params as { gameId: string };

        const session = cliGames.get(userId);
        if (!session || session.gameId !== gameId) {
          return reply.status(404).send({ error: "Game not found" });
        }

        if (!session.isActive) {
          return reply.status(400).send({ error: "Game is not active" });
        }

        session.game.update();
        session.lastUpdate = new Date();

        const currentState = session.game.getState();

        // Check if game ended
        if (session.game.isGameOver) {
          session.isActive = false;
          if (session.aiInterval) {
            clearInterval(session.aiInterval);
            session.aiInterval = undefined;
          }

          // Save game to database if it's a completed match
          try {
            if (session.game.mode === 'bot') {
              // For bot games, save with bot as player 2
              await createGame(
                userId,
                -1, // Bot player ID (could be a special value)
                session.game.score[0],
                session.game.score[1]
              );
            }
          } catch (dbError) {
            console.error("Failed to save CLI game to database:", dbError);
          }
        }

        return reply.status(200).send({
          gameId: session.gameId,
          state: currentState,
          isActive: session.isActive,
          message: session.game.isGameOver ? "Game completed" : "Game updated"
        });

      } catch (error: any) {
        console.error("CLI game update error:", error);
        return reply.status(500).send({ error: "Failed to update game" });
      }
    }
  );

  // Pause/Resume game
  app.post(
    "/cli/game/:gameId/pause",
    { preHandler: [(app as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as any).sub as number;
        const { gameId } = request.params as { gameId: string };

        const session = cliGames.get(userId);
        if (!session || session.gameId !== gameId) {
          return reply.status(404).send({ error: "Game not found" });
        }

        if (session.game.isGameOver) {
          return reply.status(400).send({ error: "Cannot pause completed game" });
        }

        session.isActive = !session.isActive;
        session.lastUpdate = new Date();

        // Pause/Resume AI if bot mode
        if (session.game.mode === 'bot') {
          if (!session.isActive && session.aiInterval) {
            clearInterval(session.aiInterval);
            session.aiInterval = undefined;
          } else if (session.isActive && !session.aiInterval) {
            session.aiInterval = startAI(session.game, 0.5); // Default difficulty
          }
        }

        return reply.status(200).send({
          gameId: session.gameId,
          isActive: session.isActive,
          state: session.game.getState(),
          message: session.isActive ? "Game resumed" : "Game paused"
        });

      } catch (error: any) {
        console.error("CLI game pause error:", error);
        return reply.status(500).send({ error: "Failed to pause/resume game" });
      }
    }
  );

  // End game (forfeit)
  app.post(
    "/cli/game/:gameId/end",
    { preHandler: [(app as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as any).sub as number;
        const { gameId } = request.params as { gameId: string };
        const { winner } = request.body as { winner?: 'p1' | 'p2' };

        const session = cliGames.get(userId);
        if (!session || session.gameId !== gameId) {
          return reply.status(404).send({ error: "Game not found" });
        }

        if (session.game.isGameOver) {
          return reply.status(400).send({ error: "Game already ended" });
        }

        // Forfeit the game
        if (winner && ['p1', 'p2'].includes(winner)) {
          session.game.forfeit(winner);
        } else {
          // Default forfeit to opponent in bot mode, or p2 in player mode
          session.game.forfeit(session.game.mode === 'bot' ? 'p2' : 'p1');
        }

        session.isActive = false;
        session.lastUpdate = new Date();

        if (session.aiInterval) {
          clearInterval(session.aiInterval);
          session.aiInterval = undefined;
        }

        // Save forfeited game to database
        try {
          if (session.game.mode === 'bot') {
            await createGame(
              userId,
              -1, // Bot player ID
              session.game.score[0],
              session.game.score[1]
            );
          }
        } catch (dbError) {
          console.error("Failed to save forfeited CLI game to database:", dbError);
        }

        return reply.status(200).send({
          gameId: session.gameId,
          state: session.game.getState(),
          isActive: session.isActive,
          message: "Game ended"
        });

      } catch (error: any) {
        console.error("CLI game end error:", error);
        return reply.status(500).send({ error: "Failed to end game" });
      }
    }
  );

  // Get all active CLI games for user
  app.get(
    "/cli/games",
    { preHandler: [(app as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as any).sub as number;

        const session = cliGames.get(userId);
        if (!session) {
          return reply.status(200).send({ games: [] });
        }

        return reply.status(200).send({
          games: [{
            gameId: session.gameId,
            mode: session.game.mode,
            isActive: session.isActive,
            isGameOver: session.game.isGameOver,
            score: session.game.score,
            winner: session.game.winner,
            createdAt: session.createdAt,
            lastUpdate: session.lastUpdate
          }]
        });

      } catch (error: any) {
        console.error("CLI games list error:", error);
        return reply.status(500).send({ error: "Failed to get games list" });
      }
    }
  );
}