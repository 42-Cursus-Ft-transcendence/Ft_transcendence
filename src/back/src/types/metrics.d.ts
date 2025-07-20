import 'fastify';
import type { Gauge, Counter } from 'prom-client';

declare module 'fastify' {
  interface FastifyInstance {
    metrics: {
      activeUsers: Gauge<string>;
      httpRequests: Counter<string>;
    };
    onUserLogin: () => void;
    onUserLogout: () => void;
  }
}
