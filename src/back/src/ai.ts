import type { WebSocket } from "@fastify/websocket";
import Game, { startAI } from "./game";

export type LocalGameState = {
    game: Game;
    loop?: NodeJS.Timeout;
    ai?: NodeJS.Timeout;
};

export const localGames = new Map<WebSocket, LocalGameState>();

export function handleAIStart(
    socket: WebSocket,
    difficulty: string
): void {
    const localGame = new Game();
    localGame.mode = "bot";

    const localLoop = setInterval(() => {
        localGame.update();
        socket.send(JSON.stringify(localGame.getState()));
    }, 1000 / 60);

    const diff = parseFloat(difficulty) || 0;
    const localAI = startAI(localGame, diff);

    localGames.set(socket, {
        game: localGame,
        loop: localLoop,
        ai: localAI
    });
}

export function handleLocalStart(socket: WebSocket): void {
    const localGame = new Game();

    const localLoop = setInterval(() => {
        localGame.update();
        socket.send(JSON.stringify(localGame.getState()));
    }, 1000 / 60);

    localGames.set(socket, {
        game: localGame,
        loop: localLoop
    });
}

export function cleanupLocalGame(socket: WebSocket): void {
    const localState = localGames.get(socket);
    if (localState) {
        if (localState.loop) clearInterval(localState.loop);
        if (localState.ai) clearInterval(localState.ai);
        localGames.delete(socket);
    }
}
