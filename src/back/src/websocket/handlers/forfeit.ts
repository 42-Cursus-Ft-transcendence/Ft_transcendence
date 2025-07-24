import type { WebSocket } from "@fastify/websocket";
import { socketToRankedSession, handleRankedForfeit } from "./tournament";
import { socketToSession, sessions } from "./online";
import { createGame } from "../../routes/userRoutes";

export async function handleForfeit(socket: WebSocket): Promise<void> {
    // Handle forfeit during ranked match (e.g., ESC key pressed)
    const rankedSession = socketToRankedSession.get(socket);
    if (rankedSession && !rankedSession.game.isGameOver) {
        await handleRankedForfeit(rankedSession, socket, "forfeit");
        return;
    }

    // Handle forfeit during online match
    const onlineSession = socketToSession.get(socket);
    if (onlineSession && !onlineSession.game.isGameOver) {
        console.log(`🎮 Player forfeited online match: ${onlineSession.id}`);
        
        const forfeitingPlayer = onlineSession.sockets.p1 === socket ? onlineSession.players.p1.userName : onlineSession.players.p2.userName;
        const otherSocket = onlineSession.sockets.p1 === socket ? onlineSession.sockets.p2 : onlineSession.sockets.p1;
        
        // Save the match to database with current scores (forfeit doesn't change scores for online matches)
        try {
            const gameId = await createGame(
                onlineSession.players.p1.sub,
                onlineSession.players.p2.sub,
                onlineSession.game.score[0],
                onlineSession.game.score[1]
            );
            console.log(`Forfeited online match saved to database with ID: ${gameId}`);
        } catch (err) {
            console.error("Failed to save forfeited online match to database:", err);
        }
        
        // Notify the other player
        try {
            otherSocket.send(JSON.stringify({
                type: "matchOver",
                reason: "opponent_forfeit",
                message: `${forfeitingPlayer} has forfeited. You win!`,
                score: onlineSession.game.score,
                winner: onlineSession.sockets.p1 === socket ? "p2" : "p1"
            }));
            console.log(`✅ Notified remaining player about forfeit in online match`);
        } catch (err) {
            console.log("Could not notify other player - they may have also disconnected");
        }

        // Clean up the session
        clearInterval(onlineSession.loopTimer);
        sessions.delete(onlineSession.id);
        socketToSession.delete(onlineSession.sockets.p1);
        socketToSession.delete(onlineSession.sockets.p2);
    }
}
