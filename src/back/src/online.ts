import type { WebSocket } from "@fastify/websocket";
import crypto from "crypto";
import Game from "./game";

export type Session = {
    id: string;
    game: Game;
    sockets: { p1: WebSocket; p2: WebSocket };
    players: {
        p1: { sub: number; userName: string };
        p2: { sub: number; userName: string };
    };
    loopTimer: NodeJS.Timeout;
};

export type WaitingItem = {
    socket: WebSocket;
    payload: { sub: number; userName: string };
};

export const waiting: WaitingItem[] = [];
export const sessions = new Map<string, Session>();
export const socketToSession = new Map<WebSocket, Session>();

export function handleOnlineStart(
    socket: WebSocket,
    payload: { sub: number; userName: string }
): void {
    if (waiting.length > 0) {
        const opponent = waiting.shift()!;
        const p1 = opponent.payload;
        const p2 = payload;
        const gameId = crypto.randomUUID();
        const sessionGame = new Game();
        sessionGame.mode = "online";

        const loopTimer = setInterval(() => {
            sessionGame.update();
            const state = JSON.stringify(sessionGame.getState());
            opponent.socket.send(state);
            socket.send(state);
        }, 1000 / 60);

        const session: Session = {
            id: gameId,
            game: sessionGame,
            sockets: { p1: opponent.socket, p2: socket },
            players: { p1, p2 },
            loopTimer,
        };
        sessions.set(gameId, session);
        socketToSession.set(opponent.socket, session);
        socketToSession.set(socket, session);

        opponent.socket.send(
            JSON.stringify({ type: "matchFound", gameId, youAre: "p1" })
        );
        socket.send(
            JSON.stringify({ type: "matchFound", gameId, youAre: "p2" })
        );
    } else {
        waiting.push({ socket, payload });
        socket.send(JSON.stringify({ type: "waiting" }));
    }
}

export function cleanupOnlineSocket(socket: WebSocket): void {
    // Remove from waiting queue
    const idx = waiting.findIndex((w) => w.socket === socket);
    if (idx >= 0) waiting.splice(idx, 1);

    // Clean up session
    const sess = socketToSession.get(socket);
    if (sess) {
        clearInterval(sess.loopTimer);
        sessions.delete(sess.id);
        socketToSession.delete(sess.sockets.p1);
        socketToSession.delete(sess.sockets.p2);
    }
}
