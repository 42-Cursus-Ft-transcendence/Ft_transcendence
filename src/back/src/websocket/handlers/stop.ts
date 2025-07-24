import type { WebSocket } from "@fastify/websocket";
import {
  socketToSession,
  sessions,
  socketToSession as onlineSocketToSession,
} from "./online";
import { localGames } from "./ai";
import { socketToRankedSession, handleRankedStop } from "./tournament";
import { createGame } from "../../routes/userRoutes";

export async function handleStop(socket: WebSocket): Promise<void> {
  // Check if socket belongs to a ranked session first
  if (socketToRankedSession.has(socket)) {
    await handleRankedStop(socket);
    return;
  }

  // Handle online session
  const sess = socketToSession.get(socket);
  if (sess) {
    if (sess.loopTimer) {
      clearInterval(sess.loopTimer);
    }
    sess.sockets.p1.send(
      JSON.stringify({
        type: "STOP",
        score1: sess.game.score[0],
        score2: sess.game.score[1],
      })
    );
    sess.sockets.p2.send(JSON.stringify({ type: "STOP" }));
    sessions.delete(sess.id);
    onlineSocketToSession.delete(sess.sockets.p1);
    onlineSocketToSession.delete(sess.sockets.p2);

    // Save online match to database instead of blockchain (only if not already saved)
    if (!sess.matchSaved) {
      try {
        console.log("Saving online match to database");
        sess.matchSaved = true; // Mark as saved before attempting
        const gameId = await createGame(
          sess.players.p1.sub, 
          sess.players.p2.sub, 
          sess.game.score[0], 
          sess.game.score[1]
        );
        console.log(`Online match saved to database with ID: ${gameId}`);
      } catch (err) {
        console.error("Failed to save online match to database:", err);
        sess.matchSaved = false; // Reset flag on error
      }
    } else {
      console.log("Match already saved, skipping save for stop");
    }

    const result = JSON.stringify({
      type: "matchOver",
      gameId: sess.id,
      score: sess.game.score,
    });
    return;
  }

  // Handle local/AI game
  const localState = localGames.get(socket);
  if (localState) {
    console.log("Game over, saving local scores");
    if (localState.loop) {
      clearInterval(localState.loop);
    }
    if (localState.ai) {
      clearInterval(localState.ai);
    }
    localGames.delete(socket);
    // TODO: post localGame.score on-chain here…
  }
}
