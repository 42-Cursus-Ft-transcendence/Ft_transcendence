import fp from "fastify-plugin";
import { FastifyInstance, FastifyPluginAsync } from "fastify";

const loggerPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook("onRequest", async (request) => {
    request.log.debug(
      { method: request.raw.method, url: request.raw.url },
      "⬅️ Incoming request"
    );
  });

  app.addHook("onResponse", async (request, reply) => {
    const duration = Date.now() - (request as any)._startTime!;
    request.log.info(
      {
        method: request.raw.method,
        url: request.raw.url,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
      },
      "➡️ Response sent"
    );
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      { err: error, method: request.raw.method, url: request.raw.url },
      "❌ Request error"
    );
    reply
      .status((error as any).statusCode || 500)
      .send({ error: error.message });
  });
};

export default fp(loggerPlugin, {
  name: "logger-plugin",
  fastify: "5.x",
});
