import type { WebSocket } from "@fastify/websocket";
import crypto from "crypto";
import Game from "./game";
import { db } from "../../db/db";
import { postScore } from "../../blockchain";

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

        const loopTimer = setInterval(async () => {
            sessionGame.update();
            const state = JSON.stringify(sessionGame.getState());
            opponent.socket.send(state);
            socket.send(state);

            // Check if game is over and auto-end
            if (sessionGame.isGameOver) {
                clearInterval(loopTimer);

                // Send match over message to both players
                const matchOverMsg = JSON.stringify({
                    type: "matchOver",
                    winner: sessionGame.winner,
                    finalScore: sessionGame.score
                });
                opponent.socket.send(matchOverMsg);
                socket.send(matchOverMsg);

                // Post scores to blockchain
                await handleOnlineMatchEnd(session);

                // Clean up session
                sessions.delete(gameId);
                socketToSession.delete(opponent.socket);
                socketToSession.delete(socket);
            }
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
            JSON.stringify({
                type: "matchFound",
                youAre: "p1",
                yourName: p1.userName,
                opponent: {
                    userName: p2.userName
                }
            })
        );
        socket.send(
            JSON.stringify({
                type: "matchFound",
                youAre: "p2",
                yourName: p2.userName,
                opponent: {
                    userName: p1.userName
                }
            })
        );
    } else {
        waiting.push({ socket, payload });
        socket.send(JSON.stringify({ type: "waiting" }));
    }
}

async function handleOnlineMatchEnd(session: Session): Promise<void> {
    try {
        console.log("Online match ended, posting scores to blockchain");

        const { p1, p2 } = session.players;
        const [score1, score2] = session.game.score;

        // Get player addresses from database
        const row1 = await new Promise<any>((resolve, reject) => {
            db.get("SELECT address FROM User WHERE idUser = ?", [p1.sub], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const row2 = await new Promise<any>((resolve, reject) => {
            db.get("SELECT address FROM User WHERE idUser = ?", [p2.sub], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (row1?.address && row2?.address) {
            console.log("blockchain posting for online match");
            const tx1 = await postScore(session.id, row1.address, score1, p1.sub);
            const tx2 = await postScore(session.id, row2.address, score2, p2.sub);
            console.log("Online scores posted to blockchain:", tx1, tx2);
        } else {
            console.log("Missing player addresses, cannot post to blockchain");
        }
    } catch (err) {
        console.error("Failed to post online match scores:", err);
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
