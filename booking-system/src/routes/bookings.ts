import { Hono } from "hono";
import { getDB } from "../../drizzle/config";
import { bookings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const bookingsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

// Get all bookings
bookingsRouter.get("/get", async (c) => {
  const db = getDB(c.env.DB);
  const results = await db.select().from(bookings);
  return c.json(results);
});

// Get a single booking by ID
bookingsRouter.get("/:id", async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param("id");
  const result = await db.select().from(bookings).where(eq(bookings.id, Number(id)));
  return c.json(result.length ? result[0] : { error: "Booking not found" }, 404);
});

// Create a new booking
bookingsRouter.post("/add", async (c) => {
  const db = getDB(c.env.DB);
  const { name, email, date, fileUrl } = await c.req.json();
  const result = await db.insert(bookings).values({ name, email, date, fileUrl }).returning();
  return c.json(result[0]);
});

// Update a booking
bookingsRouter.put("/:id", async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param("id");
  const { name, email, date, fileUrl } = await c.req.json();
  const result = await db.update(bookings).set({ name, email, date, fileUrl }).where(eq(bookings.id, Number(id))).returning();
  return c.json(result.length ? result[0] : { error: "Booking not found" }, 404);
});

// Delete a booking
bookingsRouter.delete("/:id", async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param("id");
  await db.delete(bookings).where(eq(bookings.id, Number(id)));
  return c.json({ success: true });
});

export default bookingsRouter;
