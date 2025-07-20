import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import oauthPlugin from "@fastify/oauth2";

dotenv.config({ path: path.resolve(__dirname, "../.env.backend") });
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import "./db/db"; // ← initialise la BD et les tables

// Import Routes
import userRoutes from "./routes/userRoutes";
import oauthRoutes from "./routes/oauthRoute";
import twofaRoutes from "./routes/twofaRoutes";
import scoresRoutes from "./routes/scoresRoutes";
import registerWebsocketRoutes from "./websocket";

// Import plugins
import loggerPlugin, { loggerOptions } from "./plugins/logger";
import authPlugin from "./plugins/auth";
import metricsPlugin from "./plugins/metrics";

(async () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Determine frontend directory
  // ─────────────────────────────────────────────────────────────────────────────
  const prodDir = path.resolve(__dirname, "../public");
  const devDir = path.resolve(__dirname, "../../../src/front/public");
  let publicDir: string;

  if (fs.existsSync(prodDir)) {
    publicDir = prodDir;
  } else if (fs.existsSync(devDir)) {
    publicDir = devDir;
  } else {
    console.error("❌ Frontend directory not found");
    process.exit(1);
  }
  console.log("⛳️ Serving static from:", publicDir);

  // ─────────────────────────────────────────────────────────────────────────────
  // Create Fastify + register WebSocket plugin
  // ─────────────────────────────────────────────────────────────────────────────

  const environment =
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "development";
  const isDev = environment === "development";

  const app = Fastify({
    logger: loggerOptions[environment],
    disableRequestLogging: true,
    allowErrorHandlerOverride: true,
  });
  if (isDev) {
    app.register(loggerPlugin);
  }
  console.log("Fastify instance created");

  // cookie
  app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || "une_autre_chaine_complexe", // signe/encrypte les cookies
    parseOptions: {},
  });
  // JWT
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "une_chaine_tres_complexe",
    cookie: {
      cookieName: "token", // le nom exact de ton cookie
      signed: false, // true si tu utilises la signature de fastify-cookie
    },
    sign: {
      expiresIn: "2h",
    },
  });
  // OAuth2
  app.register(oauthPlugin, {
    name: "googleOAuth2",
    scope: ["profile", "email"],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: process.env.GOOGLE_REDIRECT_PATH!, // The URL to initiate authentication
    callbackUri: process.env.GOOGLE_CALLBACK_URL!, // The callback URL after authentication
    callbackUriParams: {
      // Custom query parameters to append to the callback URL
      access_type: "offline", // Request offline mode to receive a refresh token
    },
    pkce: "S256",
  });

  // Register authentication
  await app.register(authPlugin);
  // Register metrics
  await app.register(metricsPlugin);

  // Register WebSocket plugin without any options
  await app.register(registerWebsocketRoutes);
  console.log("WebSocket plugin registered");
  // ─────────────────────────────────────────────────────────────────────────────
  // Router Registration
  // ─────────────────────────────────────────────────────────────────────────────// bd routes
  await app.register(userRoutes, { prefix: "/api" });
  await app.register(oauthRoutes, { prefix: "/api" });
  await app.register(twofaRoutes, { prefix: "/api" });
  await app.register(scoresRoutes, { prefix: "/api" });

  // ─────────────────────────────────────────────────────────────────────────────
  // Serve static frontend & SPA fallback (excluding /ws & /api)
  // ─────────────────────────────────────────────────────────────────────────────
  app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/",
    index: ["index.html"],
    wildcard: false,
  });

  app.get("/favicon.ico", (_req, reply) => {
    const ico = path.join(publicDir, "favicon.ico");
    if (fs.existsSync(ico)) {
      reply.header("Content-Type", "image/x-icon").send(fs.readFileSync(ico));
    } else {
      reply.code(204).send();
    }
  });

  app.setNotFoundHandler((req, reply) => {
    const url = req.raw.url || "";
    // let /ws handshake and /api pass through
    if (url.startsWith("/ws") || url.startsWith("/api")) {
      return reply.callNotFound();
    }
    reply.sendFile("index.html");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Start server
  // ─────────────────────────────────────────────────────────────────────────────
  const PORT = Number(process.env.PORT) || 3000;
  await app.listen({ port: PORT, host: "0.0.0.0" });
  if (isDev) {
    console.log(
      `\x1b[32m🚀 [DEV] Server running at http://localhost:${PORT}\x1b[0m`
    );
  } else {
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
