import { drizzle } from "drizzle-orm/d1";
import { D1Database } from "@cloudflare/workers-types";

export const getDB = (db: D1Database) => drizzle(db);
