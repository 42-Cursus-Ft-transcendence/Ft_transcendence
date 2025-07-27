import fp from "fastify-plugin";
import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyLoggerOptions,
} from "fastify";
import pino from "pino";
import fs from "fs";
import path from "path";

const devOpts = {
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  },
  redact: ["req.headers.authorization", "req.headers.cookie"],
};

export const loggerOptions = {
  development: devOpts as FastifyLoggerOptions,
  production: { level: "info" },
  test: { level: "silent" },
};

function createMultiLogger(level: string = "info") {
  // Default directory: <project>/logs  (override with LOG_DIR)
  const logDir = process.env.LOG_DIR || path.resolve(process.cwd(), "logs");
  const logFile = process.env.LOG_FILE || "app.log";
  // Create directory if it doesn't exist; catch permission errors
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  } catch (err) {
    // Fallback when directory creation fails
    console.error(
      "⚠️  Cannot create log directory. Falling back to ./logs",
      err
    );
  }
  const filePath = path.join(logDir, logFile);
  const streams: pino.StreamEntry[] = [
    { stream: pino.destination({ dest: filePath, sync: false }) },
    { stream: process.stdout },
  ];
  return pino({ level }, pino.multistream(streams));
}

const loggerPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const level = (app.log as any).level || process.env.LOG_LEVEL || "info";
  const multiLogger = createMultiLogger(level);
  (app as any).log = multiLogger;
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
