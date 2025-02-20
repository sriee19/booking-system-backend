import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { users } from "./db/schema"; 
import authRoutes from "./routes/auth";

const app = new Hono();
app.route("/auth", authRoutes);
app.get("/users", async (c) => {
  const db = drizzle(c.env.DB); 

  const result = await db.select().from(users); 
  return c.json(result);
});

export default app;
