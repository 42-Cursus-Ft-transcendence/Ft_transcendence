import type { WebSocket } from "@fastify/websocket";
import type { FastifyRequest } from "fastify";
import { handleRankedStart, cleanupRankedSocket } from "./tournament";
import { handleOnlineStart, cleanupOnlineSocket } from "./online";
import { handleAIStart, handleLocalStart, cleanupLocalGame } from "./ai";
import { handleInput } from "./input";
import { handleStop } from "./stop";
import { handleStopLobby } from "./stoplobby";
import { handleForfeit } from "./forfeit";

export default function wsHandler(socket: WebSocket, request: FastifyRequest) {
  const user = request.user as { sub: number; userName: string };
  console.log(`✅ WS connected: user #${user.userName}`);

  socket.on("message", async (raw: Buffer) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    switch (msg.type) {
      case "start":
        if (msg.vs === "ranked") {
          await handleRankedStart(socket, user);
        } else if (msg.vs === "online") {
          handleOnlineStart(socket, user);
        } else if (msg.vs === "bot") {
          handleAIStart(socket, msg.difficulty);
        } else {
          handleLocalStart(socket);
        }
        break;

      case "input":
        handleInput(socket, msg);
        break;

      case "stop":
        await handleStop(socket);
        break;

      case "stoplobby":
        handleStopLobby(socket, msg);
        break;

      case "forfeit":
        await handleForfeit(socket);
        break;

      default:
        socket.send(JSON.stringify({ type: "error", message: "Unknown type" }));
    }
  });

  socket.on("close", async () => {
    cleanupOnlineSocket(socket);
    cleanupLocalGame(socket);
    await cleanupRankedSocket(socket);
    console.log("⚠️ WS disconnected: user #${user.userName}");
  });
}
