import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import client, { collectDefaultMetrics, Gauge, Counter } from "prom-client";
import fp from "fastify-plugin";

const metricsPlugin: FastifyPluginAsync = async (app, opts) => {
  collectDefaultMetrics();
  app.log.info("Default metrics collection initialized");

  const activeUsers = new Gauge({
    name: "app_active_logged_in_users",
    help: "Number of currently logged‑in users",
  });

  const httpRequests = new Counter({
    name: "app_http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "status_code"] as const,
  });

  const errorCounter = new Counter({
    name: "app_errors_total",
    help: "Total number of HTTP error responses (4xx and 5xx)",
    labelNames: ["method", "status_code"] as const,
  });

  app.decorate("metrics", { activeUsers, httpRequests, errorCounter });
  app.decorate("onUserLogin", () => {
    activeUsers.inc();
    app.log.debug("User login: activeUsers incremented");
  });
  app.decorate("onUserLogout", () => {
    activeUsers.dec();
    app.log.debug("User logout: activeUsers decremented");
  });

  app.addHook("onResponse", (request, reply, done) => {
    const method = request.raw.method;
    const status = String(reply.statusCode);
    httpRequests.labels(method, status).inc();
    app.log.debug(`HTTP ${method} ${status}: httpRequests incremented`);
    done();
  });

  app.addHook("onError", (request, reply, error, done) => {
    const status = String(
      error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
    );
    errorCounter.labels(request.raw.method, status).inc();
    done();
  });

  app.get("/metrics", async (_request, reply) => {
    let metricsOutput = "";
    try {
      metricsOutput = await client.register.metrics();
      app.log.info("Serving /metrics endpoint:", metricsOutput);
    } catch (error) {
      app.log.error("Error serving /metrics endpoint:", error);
      metricsOutput =
        "# HELP app_metrics_unavailable Metrics disabled or error occurred\n" +
        "# TYPE app_metrics_unavailable gauge\n" +
        'app_metrics_unavailable{error="Metrics collection failed"} 1\n';
    }
    reply
      .header("Content-Type", client.register.contentType)
      .send(metricsOutput);
  });

  app.log.info("metricsPlugin registered");
};

export default fp(metricsPlugin, {
  name: "metrics-plugin",
  dependencies: ["auth-plugin"],
  fastify: "5.x",
});
