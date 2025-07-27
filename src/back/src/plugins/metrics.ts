import { FastifyPluginAsync } from "fastify";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Registry,
  Histogram,
  Pushgateway,
} from "prom-client";
import fp from "fastify-plugin";

const registry = new Registry();

const metricsPlugin: FastifyPluginAsync = async (app, opts) => {
  collectDefaultMetrics({ register: registry });
  app.log.info("Default metrics collection initialized");

  const activeUsers = new Gauge({
    name: "app_active_logged_in_users",
    help: "Number of currently logged‑in users",
    registers: [registry],
  });
  activeUsers.set(0);

  const httpRequests = new Counter({
    name: "app_http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "status_code"] as const,
    registers: [registry],
  });

  const errorCounter = new Counter({
    name: "app_errors_total",
    help: "Total number of HTTP error responses (4xx and 5xx)",
    labelNames: ["method", "status_code"] as const,
    registers: [registry],
  });

  const httpDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Histogram of HTTP request durations in seconds",
    labelNames: ["method", "status_code"] as const,
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [registry],
  });

  const loginSuccess = new Counter({
    name: "app_login_success_total",
    help: "Total number of successful login attempts",
    registers: [registry],
  });

  const loginFailure = new Counter({
    name: "app_login_failure_total",
    help: "Total number of failed login attempts",
    labelNames: ["reason"] as const,
    registers: [registry],
  });

  const signupCounter = new Counter({
    name: "app_signup_total",
    help: "Total number of user signups",
    registers: [registry],
  });

  const dbQueryDuration = new Histogram({
    name: "app_db_query_duration_seconds",
    help: "Duration of database queries in seconds",
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [registry],
  });

  const wsConnections = new Gauge({
    name: "app_ws_active_connections",
    help: "Active WebSocket connections",
    registers: [registry],
  });
  wsConnections.set(0);

  app.decorate("metrics", {
    activeUsers,
    httpRequests,
    errorCounter,
    httpDuration,
    loginSuccess,
    loginFailure,
    signupCounter,
    dbQueryDuration,
    wsConnections,
  });

  app.decorate("onUserLogin", () => {
    try {
      activeUsers.inc();
      const metric = activeUsers.get() as any;
      const current =
        Array.isArray(metric.values) && metric.values.length > 0
          ? metric.values[0].value
          : 0;
      app.log.info(`User login: activeUsers incremented → now ${current}`);
    } catch (err) {
      app.log.error({ err }, "Failed to increment app_active_logged_in_users");
    }
  });

  app.decorate("onUserLogout", () => {
    try {
      activeUsers.dec();
      const metric = activeUsers.get() as any;
      const current =
        Array.isArray(metric.values) && metric.values.length > 0
          ? metric.values[0].value
          : 0;
      app.log.info(`User logout: activeUsers decremented → now ${current}`);
    } catch (err) {
      app.log.error({ err }, "Failed to decrement app_active_logged_in_users");
    }
  });
  app.addHook("onRequest", (request, reply, done) => {
    (request as any).startEpoch = process.hrtime();
    done();
  });

  app.addHook("onResponse", (request, reply, done) => {
    const method = request.raw.method;
    const status = String(reply.statusCode);

    httpRequests.labels(method, status).inc();

    const [sec, nanosec] = process.hrtime((request as any).startEpoch);
    const durationSec = sec + nanosec / 1e9;
    httpDuration.labels(method, status).observe(durationSec);

    app.log.debug(
      `HTTP ${method} ${status}: count++, duration=${durationSec.toFixed(3)}s`
    );
    done();
  });

  app.addHook("onError", (request, reply, error, done) => {
    const method = request.raw.method;
    const statusCode =
      error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    const status = String(statusCode);
    errorCounter.labels(method, status).inc();
    app.log.error(
      `HTTP ${method} ${status}: errorCounter++, message=${error.message}`
    );
    done();
  });

  const pushgatewayUrl =
    process.env.PUSHGATEWAY_URL || "http://pushgateway:9091";
  if (!pushgatewayUrl) {
    app.log.error("PUSHGATEWAY_URL is not set in env");
  } else {
    const pg = new Pushgateway(pushgatewayUrl, [], registry);

    async function pushMetrics() {
      try {
        await pg.push({ jobName: "fastify-backend" });
        app.log.info("Metrics pushed to Pushgateway");
      } catch (err) {
        app.log.error({ err }, "Failed to push metrics to Pushgateway");
      }
    }

    const interval = setInterval(pushMetrics, 60_000);
    app.addHook("onClose", async () => {
      clearInterval(interval);
      try {
        await pushMetrics();
      } catch {}
    });
  }

  app.get("/metrics", async (_request, reply) => {
    let output: string;
    try {
      output = await registry.metrics();
      app.log.info("Serving /metrics");
    } catch (e) {
      output =
        "# HELP app_metrics_unavailable Metrics disabled or error occurred\n" +
        "# TYPE app_metrics_unavailable gauge\n" +
        'app_metrics_unavailable{error="collection_failed"} 1\n';
    }
    reply.header("Content-Type", registry.contentType).send(output);
  });

  app.log.info("metricsPlugin registered");
};

export default fp(metricsPlugin, {
  name: "metrics-plugin",
  fastify: "5.x",
});
