import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import wsHandler from "./handlers";

export default fp(async function registerWebsocketRoutes(app: FastifyInstance) {
  await app.register(fastifyWebsocket);

  // ─────────────────────────────────────────────────────────────────────────────
  // WebSocket endpoint: /ws (with online matchmaking + bot + local play)
  // ─────────────────────────────────────────────────────────────────────────────
  app.get(
    "/ws",
    {
      websocket: true,
      onRequest: [(app as any).authenticate],
    },
    (connection, request) => {
      const socket = connection as any;

      wsHandler(socket, request);

      app.metrics.wsConnections.inc();
      const before =
        (app.metrics.wsConnections.get() as any).values?.[0]?.value ?? 0;
      app.log.info(`WS connected → activeConnections=${before}`);

      socket.on("close", () => {
        app.metrics.wsConnections.dec();
        const after =
          (app.metrics.wsConnections.get() as any).values?.[0]?.value ?? 0;
        app.log.info(`WS disconnected → activeConnections=${after}`);
      });
    }
  );
});
