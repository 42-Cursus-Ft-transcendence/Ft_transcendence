import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import wsHandler from "./handlers";

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket endpoint: /ws (with online matchmaking + bot + local play)
// ─────────────────────────────────────────────────────────────────────────────
export default fp(async function registerWebsocketRoutes(app: FastifyInstance) {
  await app.register(fastifyWebsocket);

  app.get(
    "/ws",
    { websocket: true, onRequest: [(app as any).authenticate] },
    wsHandler as any
  );
});
