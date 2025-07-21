import "fastify";
import type { Gauge, Counter } from "prom-client";
declare module "fastify" {
  interface FastifyInstance {
    metrics: {
      activeUsers: Gauge<string>;
      httpRequests: Counter<string>;
      errorCounter: Counter<string>;
      httpDuration: Histogram<string>;
      loginSuccess: Counter<string>;
      loginFailure: Counter<string>;
      signupCounter: Counter<string>;
      dbQueryDuration: Histogram<string>;
      wsConnections: Gauge<string>;
    };
    onUserLogin: () => void;
    onUserLogout: () => void;
  }
}
