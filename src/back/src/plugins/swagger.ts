import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

export default fp(async function swaggerPlugin(app: FastifyInstance) {
  if (process.env.NODE_ENV !== "development") return;

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Transcendence API",
        description: "API documentation using Fastify + Swagger",
        version: "1.0.0",
      },
      servers: [{ url: "http://localhost:3000", description: "Local server" }],
      components: {
        securitySchemes: {
          tokenCookie: {
            type: "apiKey",
            in: "cookie",
            name: "token", // JWT token after full login
          },
          pre2faTokenCookie: {
            type: "apiKey",
            in: "cookie",
            name: "pre2faToken", // Token before completing 2FA
          },
        },
      },
      security: [
        {
          tokenCookie: [], // Default: require token for all routes
        },
      ],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: "/docs", // Swagger UI available at http://localhost:3000/docs
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });
});
