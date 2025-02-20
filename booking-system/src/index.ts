import { Hono } from "hono";
import { getDB } from "../drizzle/config";
import { bookings } from "./db/schema";
import { DrizzleD1Database } from "drizzle-orm/d1";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>(); 

app.get("/bookings", async (c) => {
  const db = getDB(c.env.DB); 
  const results = await db.select().from(bookings);
  return c.json(results);
});

export default app;
