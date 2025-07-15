import type { WebSocket } from "@fastify/websocket";
import { socketToSession, sessions, socketToSession as onlineSocketToSession } from "./online";
import { localGames } from "./ai";
import { socketToRankedSession, handleRankedStop } from "./tournament";
import { postScore } from "./blockchain";
import { getAsync } from "./routes/userRoutes";

export async function handleStop(socket: WebSocket): Promise<void> {
    // Check if socket belongs to a ranked session first
    if (socketToRankedSession.has(socket)) {
        await handleRankedStop(socket);
        return;
    }

    // Handle online session
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
        onlineSocketToSession.delete(sess.sockets.p1);
        onlineSocketToSession.delete(sess.sockets.p2);

        // Get player addresses for blockchain posting
        const row1 = await getAsync<{ address: string }>(
            `SELECT address FROM User WHERE idUser = ?`,
            [sess.players.p1.sub]
        );
        const row2 = await getAsync<{ address: string }>(
            `SELECT address FROM User WHERE idUser = ?`,
            [sess.players.p2.sub]
        );

        if (!row1 || !row2) {
            console.error("Missing on-chain address for one of the players");
        } else {
            // Post both scores on-chain
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
