import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

export default fp(async function swaggerPlugin(app: FastifyInstance) {
  if (process.env.NODE_ENV !== "development") return;

  function applyDefaultSecurity(routeOptions: any) {
    if (!routeOptions.schema) return;
    routeOptions.schema.security = routeOptions.schema.security ?? [
      { tokenCookie: [] },
    ];
  }

  app.addSchema({
    $id: "ErrorResponse",
    type: "object",
    properties: {
      error: {
        type: "string",
        example: "Something went wrong",
      },
    },
    required: ["error"],
    additionalProperties: false,
  });

  const openapiConfig = {
    info: {
      title: "Transcendence API",
      description: "API documentation using Fastify + Swagger",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:3000", description: "Local server" }],
    components: {
      securitySchemes: {
        tokenCookie: {
          type: "apiKey" as const,
          in: "cookie" as const,
          name: "token",
        },
        pre2faTokenCookie: {
          type: "apiKey" as const,
          in: "cookie" as const,
          name: "pre2faToken",
        },
      },
    },
    security: [{ tokenCookie: [] }],
  };
  await app.register(swagger, { openapi: openapiConfig });
  await app.addHook("onRoute", applyDefaultSecurity);
  await app.register(swaggerUI, {
    routePrefix: "/docs", // Swagger UI available at http://localhost:3000/docs
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });
});
