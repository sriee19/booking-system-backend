import { drizzle } from "drizzle-orm/d1";
import { env } from "hono/adapter";
import type { Context } from "hono";

export const getDB = (c: Context) => {
  const { DB } = env<{ DB: D1Database }>(c);
  return drizzle(DB);
};
