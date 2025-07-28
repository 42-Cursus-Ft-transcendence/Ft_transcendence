import type { WebSocket } from "@fastify/websocket";
import crypto from "crypto";
import Game from "./game";
import { db } from "../../db/db";
import { createGame } from "../../routes/userRoutes";

export type Session = {
    id: string;
    game: Game;
    sockets: { p1: WebSocket; p2: WebSocket };
    players: {
        p1: { sub: number; userName: string };
        p2: { sub: number; userName: string };
    };
    loopTimer: NodeJS.Timeout | null;
    matchSaved?: boolean; // Flag to prevent duplicate saves
};

export type WaitingItem = {
    socket: WebSocket;
    payload: { sub: number; userName: string };
};

export const waiting: WaitingItem[] = [];
export const sessions = new Map<string, Session>();
export const socketToSession = new Map<WebSocket, Session>();

// Function to check if a WebSocket is still alive
function isSocketAlive(socket: WebSocket): boolean {
    return socket.readyState === socket.OPEN;
}

// Clean up dead connections from waiting queue
function cleanupWaitingQueue(): void {
    for (let i = waiting.length - 1; i >= 0; i--) {
        if (!isSocketAlive(waiting[i].socket)) {
            console.log(`🧹 Removing dead connection from waiting queue: ${waiting[i].payload.userName}`);
            waiting.splice(i, 1);
        }
    }
}

// Periodic cleanup - run every 60 seconds
setInterval(() => {
    const beforeWaiting = waiting.length;
    cleanupWaitingQueue();
    const afterWaiting = waiting.length;
    
    if (beforeWaiting !== afterWaiting) {
        console.log(`🧹 Cleaned up ${beforeWaiting - afterWaiting} dead connections from waiting queue`);
    }
}, 60000);

export function handleOnlineStart(
    socket: WebSocket,
    payload: { sub: number; userName: string }
): void {
    // Clean up any dead connections before attempting to match
    cleanupWaitingQueue();
    
    if (waiting.length > 0) {
        const opponent = waiting.shift()!;
        const p1 = opponent.payload;
        const p2 = payload;
        const gameId = crypto.randomUUID();

        const sessionGame = new Game();
        sessionGame.mode = "online";

        const session: Session = {
            id: gameId,
            game: sessionGame,
            sockets: { p1: opponent.socket, p2: socket },
            players: { p1, p2 },
            loopTimer: null as any, // Will be set after matchFound messages
        };
        sessions.set(gameId, session);
        socketToSession.set(opponent.socket, session);
        socketToSession.set(socket, session);

        // Send matchFound messages
        const p1Message = JSON.stringify({
            type: "matchFound",
            gameId,
            youAre: "p1",
            yourName: p1.userName,
            opponent: {
                userName: p2.userName
            }
        });

        try {
            opponent.socket.send(p1Message);
        } catch (err) {
            console.error('Failed to send P1 match message:', err);
        }

        // Small delay between messages to avoid any potential race condition
        setTimeout(() => {
            const p2Message = JSON.stringify({
                type: "matchFound",
                gameId,
                youAre: "p2",
                yourName: p2.userName,
                opponent: {
                    userName: p1.userName
                }
            });

            try {
                socket.send(p2Message);
            } catch (err) {
                console.error('Failed to send P2 match message:', err);
            }
        }, 10);

        // Small delay to ensure matchFound messages are processed before game starts
        setTimeout(() => {
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

            // Update session with the actual timer
            session.loopTimer = loopTimer;
        }, 100); // Reduced back to 100ms since timing wasn't the issue
    } else {
        waiting.push({ socket, payload });
        socket.send(JSON.stringify({ type: "waiting" }));
    }
}

async function handleOnlineMatchEnd(session: Session): Promise<void> {
    try {
        // Prevent duplicate saves
        if (session.matchSaved) {
            console.log("Match already saved, skipping");
            return;
        }

        console.log("Online match ended, saving to database");

        const { p1, p2 } = session.players;
        const [score1, score2] = session.game.score;

        // Mark as saved before attempting to save to prevent race conditions
        session.matchSaved = true;

        // Save the match to the database using the existing createGame function
        const gameId = await createGame(p1.sub, p2.sub, score1, score2);
        console.log(`Online match saved to database with ID: ${gameId}`);

    } catch (err) {
        console.error("Failed to save online match to database:", err);
        // Reset flag on error so retry is possible
        session.matchSaved = false;
    }
}

export async function cleanupOnlineSocket(socket: WebSocket): Promise<void> {
    // Remove from waiting queue
    const idx = waiting.findIndex((w) => w.socket === socket);
    if (idx >= 0) {
        waiting.splice(idx, 1);
        console.log(`Removed player from online waiting queue`);
        return;
    }

    // Handle session cleanup
    const sess = socketToSession.get(socket);
    if (sess) {
        console.log(`🎮 Player disconnected from online match: ${sess.id}`);

        // Save the match to database with current scores (only if not already saved)
        if (!sess.matchSaved) {
            try {
                sess.matchSaved = true; // Mark as saved before attempting
                const gameId = await createGame(
                    sess.players.p1.sub,
                    sess.players.p2.sub,
                    sess.game.score[0],
                    sess.game.score[1]
                );
                console.log(`Disconnected online match saved to database with ID: ${gameId}`);
            } catch (err) {
                console.error("Failed to save disconnected online match to database:", err);
                sess.matchSaved = false; // Reset flag on error
            }
        } else {
            console.log("Match already saved, skipping save for disconnect");
        }

        // Notify the other player
        const disconnectedPlayer = sess.sockets.p1 === socket ? sess.players.p1.userName : sess.players.p2.userName;
        const otherSocket = sess.sockets.p1 === socket ? sess.sockets.p2 : sess.sockets.p1;

        try {
            otherSocket.send(JSON.stringify({
                type: "matchOver",
                reason: "opponent_disconnected",
                message: `${disconnectedPlayer} has disconnected.`,
                score: sess.game.score,
                winner: null // No winner for disconnected online matches
            }));
            console.log(`✅ Notified remaining player about opponent disconnect`);
        } catch (err) {
            console.log("Could not notify other player - they may have also disconnected");
        }

        // Clean up session
        if (sess.loopTimer) {
            clearInterval(sess.loopTimer);
        }
        sessions.delete(sess.id);
        socketToSession.delete(sess.sockets.p1);
        socketToSession.delete(sess.sockets.p2);
    }
}
