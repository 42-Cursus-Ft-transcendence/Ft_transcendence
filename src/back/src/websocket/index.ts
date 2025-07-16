import type { FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import wsHandler from "./handlers";

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket endpoint: /ws (with online matchmaking + bot + local play)
// ─────────────────────────────────────────────────────────────────────────────
export default async function registerWebsocketRoutes(app: FastifyInstance) {
  app.register(fastifyWebsocket);

  app.get(
    "/ws",
    { websocket: true, preHandler: [(app as any).authenticate] },
    wsHandler as any
  );
}
