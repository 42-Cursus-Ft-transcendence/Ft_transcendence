import { runAsync } from "../db";
import { FastifyReply } from "fastify";

export class ValidationError extends Error {
  public status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function assertValidEmail(email: string): void {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    throw new ValidationError("Invalid Email Format", 400);
  }
}

/**
 * Determines whether a specific value already exists in a given table column.
 *
 * @param table  - The name of the database table (e.g., 'User').
 * @param column - The name of the column to check (e.g., 'email' or 'userName').
 * @param value  - The value to search for in the specified column.
 * @returns True if the value is already taken, false if it is available.
 */
export async function validateUnique(
  table: string,
  column: string,
  value: string,
  message: string
): Promise<boolean> {
  const query = `SELECT COUNT(*) FROM ${table} WHERE ${column} = ?`;
  // runAsync is expected to return the count directly as a number
  const result: any = await runAsync(query, [value]);

  if (!Array.isArray(result) || result.length === 0) {
    return false;
  }

  // The first row should have the 'cnt' property
  const cnt =
    typeof result[0].cnt === "string"
      ? parseInt(result[0].cnt, 10)
      : result[0].cnt;
  if (cnt > 0) {
    throw new ValidationError(message, 409);
  }
}
