import type { WebSocket } from "@fastify/websocket";
import { db } from "../../db/db";
import { getAsync } from "../../db";
import { postScore } from "../../blockchain";
import Game from "./game";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Types for Tournament System
// ─────────────────────────────────────────────────────────────────────────────
export interface RankedPlayer {
  sub: number;
  userName: string;
  elo: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export interface RankedWaitingItem {
  socket: WebSocket;
  payload: RankedPlayer;
  joinTime: number;
}

export interface RankedSession {
  id: string;
  game: Game;
  sockets: { p1: WebSocket; p2: WebSocket };
  players: {
    p1: RankedPlayer;
    p2: RankedPlayer;
  };
  loopTimer: NodeJS.Timeout;
  startTime: number;
  isRanked: true;
}

export interface EloUpdate {
  playerId: number;
  oldElo: number;
  newElo: number;
  eloChange: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tournament State Management
// ─────────────────────────────────────────────────────────────────────────────
export const rankedWaiting: RankedWaitingItem[] = [];
const rankedSessions = new Map<string, RankedSession>();
export const socketToRankedSession = new Map<WebSocket, RankedSession>();

// ─────────────────────────────────────────────────────────────────────────────
// ELO Rating System
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_ELO = 1200;
const K_FACTOR = 32; // Standard K-factor for ELO calculations

function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateNewElo(
  currentElo: number,
  opponentElo: number,
  actualScore: number
): number {
  const expectedScore = calculateExpectedScore(currentElo, opponentElo);
  return Math.round(currentElo + K_FACTOR * (actualScore - expectedScore));
}

function calculateEloChanges(
  player1: RankedPlayer,
  player2: RankedPlayer,
  player1Score: number,
  player2Score: number
): { p1Update: EloUpdate; p2Update: EloUpdate } {
  // Determine winner (1 = player1 wins, 0.5 = draw, 0 = player2 wins)
  let p1ActualScore: number;
  let p2ActualScore: number;

  if (player1Score > player2Score) {
    p1ActualScore = 1;
    p2ActualScore = 0;
  } else if (player2Score > player1Score) {
    p1ActualScore = 0;
    p2ActualScore = 1;
  } else {
    p1ActualScore = 0.5;
    p2ActualScore = 0.5;
  }

  const p1NewElo = calculateNewElo(player1.elo, player2.elo, p1ActualScore);
  const p2NewElo = calculateNewElo(player2.elo, player1.elo, p2ActualScore);

  return {
    p1Update: {
      playerId: player1.sub,
      oldElo: player1.elo,
      newElo: p1NewElo,
      eloChange: p1NewElo - player1.elo,
    },
    p2Update: {
      playerId: player2.sub,
      oldElo: player2.elo,
      newElo: p2NewElo,
      eloChange: p2NewElo - player2.elo,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Operations
// ─────────────────────────────────────────────────────────────────────────────
async function initializePlayerRanking(userId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO PlayerRanking (userId, elo, wins, losses, gamesPlayed) 
       VALUES (?, ?, 0, 0, 0)`,
      [userId, DEFAULT_ELO],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function getPlayerRanking(userId: number): Promise<RankedPlayer | null> {
  const userRow = await getAsync<{ userName: string }>(
    `SELECT userName FROM User WHERE idUser = ?`,
    [userId]
  );

  if (!userRow) return null;

  let rankingRow = await getAsync<{
    elo: number;
    wins: number;
    losses: number;
    gamesPlayed: number;
  }>(
    `SELECT elo, wins, losses, gamesPlayed FROM PlayerRanking WHERE userId = ?`,
    [userId]
  );

  if (!rankingRow) {
    await initializePlayerRanking(userId);
    rankingRow = {
      elo: DEFAULT_ELO,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
    };
  }

  return {
    sub: userId,
    userName: userRow.userName,
    elo: rankingRow.elo,
    wins: rankingRow.wins,
    losses: rankingRow.losses,
    gamesPlayed: rankingRow.gamesPlayed,
  };
}

async function updatePlayerRanking(
  update: EloUpdate,
  won: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const winsIncrement = won ? 1 : 0;
    const lossesIncrement = won ? 0 : 1;

    db.run(
      `UPDATE PlayerRanking 
       SET elo = ?, wins = wins + ?, losses = losses + ?, gamesPlayed = gamesPlayed + 1
       WHERE userId = ?`,
      [update.newElo, winsIncrement, lossesIncrement, update.playerId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function saveRankedMatch(
  matchId: string,
  player1: RankedPlayer,
  player2: RankedPlayer,
  score1: number,
  score2: number,
  eloChanges: { p1Update: EloUpdate; p2Update: EloUpdate }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const winnerId =
      score1 > score2 ? player1.sub : score2 > score1 ? player2.sub : null;

    db.run(
      `INSERT INTO RankedMatch (matchId, player1Id, player2Id, player1Score, player2Score, 
       winnerId, player1EloChange, player2EloChange, matchDate) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        matchId,
        player1.sub,
        player2.sub,
        score1,
        score2,
        winnerId,
        eloChanges.p1Update.eloChange,
        eloChanges.p2Update.eloChange,
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Matchmaking Logic
// ─────────────────────────────────────────────────────────────────────────────
function findRankedMatch(
  newPlayer: RankedWaitingItem
): RankedWaitingItem | null {
  const maxEloDifference = 200; // Maximum ELO difference for matchmaking
  const maxWaitTime = 30000; // 30 seconds max wait time
  const currentTime = Date.now();

  // Sort by ELO to find closest matches first
  const sortedWaiting = rankedWaiting
    .filter((item) => item !== newPlayer)
    .sort(
      (a, b) =>
        Math.abs(a.payload.elo - newPlayer.payload.elo) -
        Math.abs(b.payload.elo - newPlayer.payload.elo)
    );

  for (const opponent of sortedWaiting) {
    const eloDifference = Math.abs(
      opponent.payload.elo - newPlayer.payload.elo
    );
    const waitTime = currentTime - opponent.joinTime;

    // Match if ELO difference is acceptable or if opponent has waited too long
    if (eloDifference <= maxEloDifference || waitTime > maxWaitTime) {
      return opponent;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tournament WebSocket Handlers
// ─────────────────────────────────────────────────────────────────────────────
export async function handleRankedStart(
  socket: WebSocket,
  payload: { sub: number; userName: string }
): Promise<void> {
  try {
    const rankedPlayer = await getPlayerRanking(payload.sub);
    if (!rankedPlayer) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Failed to load player ranking",
        })
      );
      return;
    }

    const newWaitingItem: RankedWaitingItem = {
      socket,
      payload: rankedPlayer,
      joinTime: Date.now(),
    };

    const opponent = findRankedMatch(newWaitingItem);

    if (opponent) {
      // Remove opponent from waiting queue
      const opponentIndex = rankedWaiting.indexOf(opponent);
      if (opponentIndex > -1) {
        rankedWaiting.splice(opponentIndex, 1);
      }

      // Create ranked match
      const gameId = crypto.randomUUID();
      const sessionGame = new Game();
      sessionGame.mode = "online";
      sessionGame.setMaxScore(10); // Set target to 10 for ranked matches

      const session: RankedSession = {
        id: gameId,
        game: sessionGame,
        sockets: { p1: opponent.socket, p2: socket },
        players: { p1: opponent.payload, p2: rankedPlayer },
        loopTimer: null as any, // Will be set after rankedMatchFound messages
        startTime: Date.now(),
        isRanked: true,
      };

      rankedSessions.set(gameId, session);
      socketToRankedSession.set(opponent.socket, session);
      socketToRankedSession.set(socket, session);

      // Send rankedMatchFound messages with delay to avoid race condition
      console.log('🎯 Sending rankedMatchFound to p1 (opponent):', {
        userName: opponent.payload.userName,
        opponentName: rankedPlayer.userName,
        socketState: opponent.socket.readyState
      });

      const p1Message = JSON.stringify({
        type: "rankedMatchFound",
        gameId,
        youAre: "p1",
        yourElo: opponent.payload.elo,
        yourName: opponent.payload.userName,
        opponent: {
          userName: rankedPlayer.userName,
          elo: rankedPlayer.elo,
        },
      });

      try {
        opponent.socket.send(p1Message);
        console.log('✅ P1 ranked message sent successfully');
      } catch (err) {
        console.error('❌ Failed to send P1 ranked message:', err);
      }

      // Small delay between messages to avoid any potential race condition
      setTimeout(() => {
        console.log('🎯 Now sending rankedMatchFound to p2 (socket):', {
          userName: rankedPlayer.userName,
          opponentName: opponent.payload.userName,
          socketState: socket.readyState
        });

        const p2Message = JSON.stringify({
          type: "rankedMatchFound",
          gameId,
          youAre: "p2",
          yourElo: rankedPlayer.elo,
          yourName: rankedPlayer.userName,
          opponent: {
            userName: opponent.payload.userName,
            elo: opponent.payload.elo,
          },
        });

        try {
          socket.send(p2Message);
          console.log('✅ P2 ranked message sent successfully');
        } catch (err) {
          console.error('❌ Failed to send P2 ranked message:', err);
        }

        console.log('📨 Both rankedMatchFound messages attempted. P1 message:', p1Message);
        console.log('📨 P2 message:', p2Message);
      }, 10); // 10ms delay between messages

      // Small delay to ensure rankedMatchFound messages are processed before game starts
      setTimeout(() => {
        const loopTimer = setInterval(async () => {
          sessionGame.update();
          const state = JSON.stringify(sessionGame.getState());
          opponent.socket.send(state);
          socket.send(state);

          // Check if game is over and auto-end match
          if (sessionGame.isGameOver) {
            clearInterval(loopTimer);
            await handleRankedMatchEnd(session);
          }
        }, 1000 / 60);

        // Update session with the actual timer
        session.loopTimer = loopTimer;
      }, 50); // 50ms delay to ensure message order
    } else {
      // Add to waiting queue
      rankedWaiting.push(newWaitingItem);
      socket.send(
        JSON.stringify({
          type: "rankedWaiting",
          currentElo: rankedPlayer.elo,
          rank: await getPlayerRank(rankedPlayer.sub),
        })
      );
    }
  } catch (error) {
    console.error("Error handling ranked start:", error);
    socket.send(
      JSON.stringify({ type: "error", message: "Failed to start ranked match" })
    );
  }
}

export function handleRankedInput(
  socket: WebSocket,
  direction: "up" | "down" | "stop"
): void {
  const session = socketToRankedSession.get(socket);
  if (!session) return;

  const player = socket === session.sockets.p1 ? "p1" : "p2";
  session.game.applyInput(player, direction);
}

export async function handleRankedStop(socket: WebSocket): Promise<void> {
  const session = socketToRankedSession.get(socket);
  if (!session) return;

  // When someone manually stops (back button), treat it as a forfeit
  if (!session.game.isGameOver) {
    console.log('🏆 Player manually stopped ranked match - treating as forfeit');
    await handleRankedForfeit(session, socket, "forfeit");
  } else {
    // Game was already over, just clean up
    await handleRankedMatchEnd(session);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Match ending logic (common for both normal end and auto-end)
// ─────────────────────────────────────────────────────────────────────────────
async function handleRankedMatchEnd(session: RankedSession): Promise<void> {
  try {
    clearInterval(session.loopTimer);

    const score1 = session.game.score[0];
    const score2 = session.game.score[1];

    // Calculate ELO changes
    const eloChanges = calculateEloChanges(
      session.players.p1,
      session.players.p2,
      score1,
      score2
    );

    // Update player rankings
    await updatePlayerRanking(eloChanges.p1Update, score1 > score2);
    await updatePlayerRanking(eloChanges.p2Update, score2 > score1);

    // Save match to database
    await saveRankedMatch(
      session.id,
      session.players.p1,
      session.players.p2,
      score1,
      score2,
      eloChanges
    );

    // Post scores to blockchain (only if not already posted due to disconnect)
    if (!(session as any).disconnectHandled) {
      try {
        const row1 = await getAsync<{ address: string }>(
          `SELECT address FROM User WHERE idUser = ?`,
          [session.players.p1.sub]
        );
        const row2 = await getAsync<{ address: string }>(
          `SELECT address FROM User WHERE idUser = ?`,
          [session.players.p2.sub]
        );

        if (row1 && row2) {
          const tx1 = await postScore(session.id, row1.address, score1, session.players.p1.sub);
          const tx2 = await postScore(session.id, row2.address, score2, session.players.p2.sub);
          console.log("Ranked scores posted to blockchain:", tx1, tx2);

          // Store transaction hashes in database for blockchain explorer
          try {
            await new Promise<void>((resolve, reject) => {
              db.run(
                `INSERT OR REPLACE INTO BlockchainTransactions 
                 (game_id, userId, player_address, score, hash, timestamp, status) 
                 VALUES (?, ?, ?, ?, ?, datetime('now'), 'confirmed')`,
                [session.id, session.players.p1.sub, row1.address, score1, tx1],
                (err) => err ? reject(err) : resolve()
              );
            });

            await new Promise<void>((resolve, reject) => {
              db.run(
                `INSERT OR REPLACE INTO BlockchainTransactions 
                 (game_id, userId, player_address, score, hash, timestamp, status) 
                 VALUES (?, ?, ?, ?, ?, datetime('now'), 'confirmed')`,
                [session.id, session.players.p2.sub, row2.address, score2, tx2],
                (err) => err ? reject(err) : resolve()
              );
            });

            console.log("Normal game transaction hashes stored in database");
          } catch (err) {
            console.error("Failed to store normal game transaction hashes:", err);
          }
        }
      } catch (err) {
        console.error("Failed to post ranked scores to blockchain:", err);
      }
    } else {
      console.log("Scores already posted due to disconnect, skipping blockchain posting");
    }

    // Notify players of match results
    const matchResult = {
      type: "rankedMatchOver",
      gameId: session.id,
      score: [score1, score2],
      eloChanges: {
        p1: eloChanges.p1Update,
        p2: eloChanges.p2Update,
      },
      duration: Date.now() - session.startTime,
      winner: session.game.winner,
    };

    session.sockets.p1.send(JSON.stringify(matchResult));
    session.sockets.p2.send(JSON.stringify(matchResult));

    // Clean up session
    rankedSessions.delete(session.id);
    socketToRankedSession.delete(session.sockets.p1);
    socketToRankedSession.delete(session.sockets.p2);

    console.log(
      `Ranked match ${session.id} completed. ELO changes:`,
      eloChanges
    );
  } catch (error) {
    console.error("Error handling ranked match end:", error);
  }
}

export function handleRankedStopLobby(socket: WebSocket): void {
  const index = rankedWaiting.findIndex((item) => item.socket === socket);
  if (index >= 0) {
    rankedWaiting.splice(index, 1);
    socket.send(JSON.stringify({ type: "rankedLobbyLeft" }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Forfeit handling for disconnections
// ─────────────────────────────────────────────────────────────────────────────
export async function handleRankedForfeit(
  session: RankedSession,
  disconnectedSocket: WebSocket,
  reason: string = "disconnection"
): Promise<void> {
  try {
    // Determine who disconnected and who wins
    const disconnectedPlayer =
      disconnectedSocket === session.sockets.p1 ? "p1" : "p2";
    const winner = disconnectedPlayer === "p1" ? "p2" : "p1";
    const disconnectedPlayerName = disconnectedPlayer === "p1" ? session.players.p1.userName : session.players.p2.userName;
    const remainingSocket = disconnectedPlayer === "p1" ? session.sockets.p2 : session.sockets.p1;

    console.log(
      `🏆 Player ${disconnectedPlayerName} (${disconnectedPlayer}) forfeited due to ${reason}. Winner: ${winner}`
    );

    // Set forfeit score (10-0 for the remaining player)
    session.game.forfeit(winner);

    // End the match with forfeit scores - this handles ELO, database, and blockchain
    await handleRankedMatchEnd(session);

    // Notify the remaining player about the forfeit
    try {
      remainingSocket.send(
        JSON.stringify({
          type: "matchOver",
          reason: "opponent_forfeit",
          message: `${disconnectedPlayerName} has ${reason === "disconnection" ? "disconnected" : "forfeited"}. You win!`,
          gameId: session.id,
          winner: winner,
          score: session.game.score,
          forfeit: true
        })
      );
      console.log(`✅ Notified remaining player about forfeit win`);
    } catch (err) {
      console.log(
        "Could not notify remaining player - they may have also disconnected"
      );
    }
  } catch (error) {
    console.error("Error handling ranked forfeit:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────
async function getPlayerRank(userId: number): Promise<number> {
  const row = await getAsync<{ rank: number }>(
    `SELECT COUNT(*) + 1 as rank FROM PlayerRanking 
     WHERE elo > (SELECT elo FROM PlayerRanking WHERE userId = ?)`,
    [userId]
  );
  return row?.rank || 1;
}

export async function getLeaderboard(limit: number = 10): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.idUser as userId, u.userName, u.avatarURL, pr.elo, pr.wins, pr.losses, pr.gamesPlayed 
       FROM PlayerRanking pr 
       JOIN User u ON pr.userId = u.idUser 
       ORDER BY pr.elo DESC 
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup function for disconnected sockets
// ─────────────────────────────────────────────────────────────────────────────
export async function cleanupRankedSocket(socket: WebSocket): Promise<void> {
  // Remove from waiting queue
  const waitingIndex = rankedWaiting.findIndex(
    (item) => item.socket === socket
  );
  if (waitingIndex >= 0) {
    rankedWaiting.splice(waitingIndex, 1);
    console.log(`Removed player from ranked waiting queue`);
    return;
  }

  // Handle session cleanup with forfeit
  const session = socketToRankedSession.get(socket);
  if (session) {
    // Check if disconnect was already handled
    if ((session as any).disconnectHandled) {
      console.log("Disconnect already handled, just cleaning up session");
      clearInterval(session.loopTimer);
      rankedSessions.delete(session.id);
      socketToRankedSession.delete(session.sockets.p1);
      socketToRankedSession.delete(session.sockets.p2);
      return;
    }

    // Check if the game is still in progress (not already ended)
    if (!session.game.isGameOver) {
      console.log(
        `🏆 Player disconnected during active ranked match: ${session.id} - handling forfeit`
      );

      // Mark disconnect as being handled to prevent duplicate processing
      (session as any).disconnectHandled = true;

      await handleRankedForfeit(session, socket, "disconnection");
    } else {
      // Game was already over, just clean up
      console.log(`Game already over, cleaning up ranked session: ${session.id}`);
      clearInterval(session.loopTimer);
      rankedSessions.delete(session.id);
      socketToRankedSession.delete(session.sockets.p1);
      socketToRankedSession.delete(session.sockets.p2);
    }
  }
}