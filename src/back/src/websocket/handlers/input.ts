import type { WebSocket } from "@fastify/websocket";
import { socketToSession } from "./online";
import { localGames } from "./ai";
import { socketToRankedSession, handleRankedInput } from "./tournament";

export function handleInput(
    socket: WebSocket,
    msg: { dir: "up" | "down" | "stop"; player?: string }
): void {
    // Check if socket belongs to a ranked session first
    if (socketToRankedSession.has(socket)) {
        handleRankedInput(socket, msg.dir);
        return;
    }

    // Check for online session
    const sess = socketToSession.get(socket);
    if (sess) {
        const who = socket === sess.sockets.p1 ? "p1" : "p2";
        sess.game.applyInput(who, msg.dir);
        return;
    }

    // Handle local/AI game
    const localState = localGames.get(socket);
    if (localState) {
        const ply = msg.player === "p2" ? "p2" : "p1";
        if (ply === "p2" && localState.game.mode !== "player") return;
        localState.game.applyInput(ply, msg.dir);
    }
}
