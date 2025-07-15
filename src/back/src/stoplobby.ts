import type { WebSocket } from "@fastify/websocket";
import { waiting } from "./online";
import { socketToRankedSession, handleRankedStopLobby } from "./tournament";

export function handleStopLobby(
    socket: WebSocket,
    msg: { vs?: string }
): void {
    // Check if it's ranked lobby first
    if (msg.vs === "ranked" || socketToRankedSession.has(socket)) {
        handleRankedStopLobby(socket);
        return;
    }

    // Handle online lobby
    const item = waiting.findIndex((w) => w.socket === socket);
    if (item >= 0) {
        waiting.splice(item, 1);
    }
}
