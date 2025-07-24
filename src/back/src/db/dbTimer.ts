// src/db/dbTimer.ts
import { FastifyInstance } from "fastify";
import { Database } from "sqlite3";

export function registerDbTimer(app: FastifyInstance) {
  const hist = (app as any).metrics.dbQueryDuration as {
    observe: (value: number) => void;
  };
  const db: Database = (app as any).db;

  (["run", "get", "all"] as const).forEach((method) => {
    const orig = db[method] as Function;
    (db as any)[method] = function (
      sql: string,
      paramsOrCb?: any[] | ((err: Error | null, row?: any) => void),
      maybeCb?: (err: Error | null, row?: any) => void
    ) {
      const params = Array.isArray(paramsOrCb) ? paramsOrCb : [];
      const callback: Function | undefined =
        typeof paramsOrCb === "function" ? paramsOrCb : maybeCb;

      const start = process.hrtime();

      if (!callback) {
        return orig.call(this, sql, params);
      }

      const wrappedCb = function (this: any, err: Error | null, result: any) {
        const [sec, nanosec] = process.hrtime(start);
        hist.observe(sec + nanosec / 1e9);
        callback.call(this, err, result);
      };

      return orig.call(this, sql, params, wrappedCb);
    };
  });
}
