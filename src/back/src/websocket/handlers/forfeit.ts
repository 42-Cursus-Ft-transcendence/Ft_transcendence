import type { WebSocket } from "@fastify/websocket";
import { socketToRankedSession, handleRankedForfeit } from "./tournament";

export async function handleForfeit(socket: WebSocket): Promise<void> {
    // Handle forfeit during ranked match (e.g., ESC key pressed)
    const session = socketToRankedSession.get(socket);
    if (session && !session.game.isGameOver) {
        await handleRankedForfeit(session, socket, "forfeit");
    }
}
