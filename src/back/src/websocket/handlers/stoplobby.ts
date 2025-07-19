import type { WebSocket } from "@fastify/websocket";
import { waiting } from "./online";
import { rankedWaiting} from "./tournament";
import { socketToRankedSession, handleRankedStopLobby } from "./tournament";

export function handleStopLobby(
    socket: WebSocket,
    msg: { vs?: string }
): void {
    // Check if socket is in ranked session first
    if (rankedWaiting.some(item => item.socket === socket)) {
        console.log('Removing socket from ranked lobby');
        handleRankedStopLobby(socket);
        return;
    }

    // Check if socket is in online waiting queue
    const item = waiting.findIndex((w) => w.socket === socket);
    if (item >= 0) {
        console.log('Removing socket from online lobby');
        waiting.splice(item, 1);
        return;
    }

    console.log('Socket not found in any lobby');
}
