import { db } from "../db/db";

export function runAsync(sql: string, values: any[]): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(
      sql,
      values,
      function (this: { lastID: number; changes: number }, error) {
        if (error) {
          reject(error);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

export function getAsync<T = any>(
  sql: string,
  params: any[]
): Promise<T | null> {
  return new Promise((resolve, rejects) => {
    db.get(sql, params, (err, row) => {
      if (err) rejects(err);
      else resolve((row as T) ?? null);
    });
  });
}
