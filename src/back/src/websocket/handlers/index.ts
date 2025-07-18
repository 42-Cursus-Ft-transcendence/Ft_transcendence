import type { WebSocket } from "@fastify/websocket";
import type { FastifyRequest } from "fastify";
import { handleRankedStart, cleanupRankedSocket, socketToRankedSession } from "./tournament";
import { handleOnlineStart, cleanupOnlineSocket } from "./online";
import { handleAIStart, handleLocalStart, cleanupLocalGame } from "./ai";
import { handleInput } from "./input";
import { handleStop } from "./stop";
import { handleStopLobby } from "./stoplobby";
import { handleForfeit } from "./forfeit";
import { socketToSession } from "./online";
import { RankedSession } from "./tournament";
import { getAsync } from "../../db";
import { postScore } from "../../blockchain";
import { db } from "../../db/db";

export default function wsHandler(socket: WebSocket, request: FastifyRequest) {
  const user = request.user as { sub: number; userName: string };
  console.log(`✅ WS connected: user #${user.userName}`);

  socket.on("message", async (raw: Buffer) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    switch (msg.type) {
      case "start":
        if (msg.vs === "ranked") {
          await handleRankedStart(socket, user);
        } else if (msg.vs === "online") {
          handleOnlineStart(socket, user);
        } else if (msg.vs === "bot") {
          handleAIStart(socket, msg.difficulty);
        } else {
          handleLocalStart(socket);
        }
        break;

      case "input":
        handleInput(socket, msg);
        break;

      case "stop":
        await handleStop(socket);
        break;

      case "stoplobby":
        handleStopLobby(socket, msg);
        break;

      case "forfeit":
        await handleForfeit(socket);
        break;

      default:
        socket.send(JSON.stringify({ type: "error", message: "Unknown type" }));
    }
  });

  socket.on("close", async () => {
    // Handle online session cleanup
    if (socketToSession.has(socket)) {
      const session = socketToSession.get(socket);
      if (session) {
        console.log(`⚠️ WS disconnected: user #${session.players.p1.userName} vs ${session.players.p2.userName}`);
        session.sockets.p1.send(JSON.stringify({ type: "STOP" }));
        session.sockets.p2.send(JSON.stringify({ type: "STOP" }));
      }
    }

    // Handle ranked session cleanup with forfeit
    if (socketToRankedSession.has(socket)) {
      const rankedSession = socketToRankedSession.get(socket);
      if (rankedSession && !rankedSession.game.isGameOver) {
        console.log(`🏆 Ranked game disconnect: forfeiting for disconnected player`);

        // Determine which player disconnected and forfeit for them
        const isP1 = rankedSession.sockets.p1 === socket;
        const winner = isP1 ? 'p2' : 'p1';

        // Forfeit the game (this should trigger score posting)
        rankedSession.game.forfeit(winner);

        // Get final scores after forfeit
        const score1 = rankedSession.game.score[0];
        const score2 = rankedSession.game.score[1];

        // Post scores to blockchain immediately (only for disconnections)
        try {
          const row1 = await getAsync<{ address: string }>(
            `SELECT address FROM User WHERE idUser = ?`,
            [rankedSession.players.p1.sub]
          );
          const row2 = await getAsync<{ address: string }>(
            `SELECT address FROM User WHERE idUser = ?`,
            [rankedSession.players.p2.sub]
          );

          if (row1 && row2) {
            const tx1 = await postScore(rankedSession.id, row1.address, score1, rankedSession.players.p1.sub);
            const tx2 = await postScore(rankedSession.id, row2.address, score2, rankedSession.players.p2.sub);
            console.log("Forfeit scores posted to blockchain:", tx1, tx2);

            // Store transaction hashes in database for blockchain explorer
            try {
              await new Promise<void>((resolve, reject) => {
                db.run(
                  `INSERT OR REPLACE INTO BlockchainTransactions 
                   (gameId, playerId, playerAddress, score, transactionHash, gameType, createdAt) 
                   VALUES (?, ?, ?, ?, ?, 'ranked', datetime('now'))`,
                  [rankedSession.id, rankedSession.players.p1.sub, row1.address, score1, tx1],
                  (err) => err ? reject(err) : resolve()
                );
              });

              await new Promise<void>((resolve, reject) => {
                db.run(
                  `INSERT OR REPLACE INTO BlockchainTransactions 
                   (gameId, playerId, playerAddress, score, transactionHash, gameType, createdAt) 
                   VALUES (?, ?, ?, ?, ?, 'ranked', datetime('now'))`,
                  [rankedSession.id, rankedSession.players.p2.sub, row2.address, score2, tx2],
                  (err) => err ? reject(err) : resolve()
                );
              });

              console.log("Forfeit transaction hashes stored in database");
            } catch (err) {
              console.error("Failed to store forfeit transaction hashes:", err);
            }
          }
        } catch (err) {
          console.error("Failed to post forfeit scores to blockchain:", err);
        }

        // Notify the other player
        const otherSocket = isP1 ? rankedSession.sockets.p2 : rankedSession.sockets.p1;
        const disconnectedPlayer = isP1 ? rankedSession.players.p1.userName : rankedSession.players.p2.userName;

        try {
          otherSocket?.send(JSON.stringify({
            type: "STOP",
            reason: "opponent_disconnected",
            message: `${disconnectedPlayer} has disconnected. You win by forfeit!`,
            winner: winner,
            score: [score1, score2]
          }));
        } catch (err) {
          console.log("Could not notify other player - they may have also disconnected");
        }

        console.log(`🏆 Forfeit win awarded to ${winner} due to ${disconnectedPlayer} disconnect`);
      }
    }

    cleanupOnlineSocket(socket);
    cleanupLocalGame(socket);
    await cleanupRankedSocket(socket);
    console.log(`⚠️ WS disconnected: user #${user.userName}`);
  });
}
