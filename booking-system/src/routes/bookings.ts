import { Hono } from "hono";
import { cors } from "hono/cors";
import { CreateBookingSchema } from "../validations/users";
import { initializeDb } from "../db";
import { bookings } from "../db/schema";
import { eq } from "drizzle-orm";
import { verifyToken, generateToken } from "../utils/jwt";
import { z } from "zod";

export const bookingRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

export const UpdateBookingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  calendarDate: z.string().min(1, "Date is required"),
});

bookingRoutes.use(
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
  })
);

bookingRoutes.options("*", (c) => c.text("OK", 200));

// Create Booking
bookingRoutes.post("/", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const body = await c.req.json();
    const { name, email, calendarDate } = CreateBookingSchema.parse(body);

    const db = initializeDb(c.env.DB);
    const [newBooking] = await db
      .insert(bookings)
      .values({
        uid: crypto.randomUUID(),
        userid: payload.uuid as string,
        name,
        email,
        calendarDate,
        fileurl:"",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return c.json({ message: "Booking successful", booking: newBooking }, 201);
  } catch (err) {
    return c.json({ error: "Invalid data or server error" }, 400);
  }
});

// Update Booking
bookingRoutes.put("/:uid", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const uid = c.req.param("uid");
    const body = await c.req.json();
    const { name, email, calendarDate } = UpdateBookingSchema.parse(body);

    const db = initializeDb(c.env.DB);
    const existingBooking = await db.select().from(bookings).where(eq(bookings.uid, uid)).then(rows => rows[0]);

    if (!existingBooking) return c.json({ error: "Booking not found" }, 404);
    if (existingBooking.userid !== payload.uuid) return c.json({ error: "Forbidden" }, 403);

    const [updatedBooking] = await db.update(bookings).set({ name, email, calendarDate, updatedAt: new Date().toISOString() }).where(eq(bookings.uid, uid)).returning();

    return c.json({ message: "Booking updated successfully", booking: updatedBooking }, 200);
  } catch (err) {
    return c.json({ error: "Invalid data or server error" }, 400);
  }
});

// Delete Booking
bookingRoutes.delete("/:uid", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const uid = c.req.param("uid");
    const db = initializeDb(c.env.DB);
    await db.delete(bookings).where(eq(bookings.uid, uid));

    return c.json({ message: "Booking deleted successfully" }, 200);
  } catch (err) {
    return c.json({ error: "Server error" }, 500);
  }
});

// Get All Bookings
bookingRoutes.get("/book", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const db = initializeDb(c.env.DB);
    const allBookings = await db.select().from(bookings);

    return c.json({ bookings: allBookings }, 200);
  } catch (err) {
    return c.json({ error: "Server error" }, 500);
  }
});

// Get User Bookings
bookingRoutes.get("/user", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload || typeof payload.uuid !== "string") {
      return c.json({ error: "Invalid token or user ID" }, 401);
    }

    const userId = payload.uuid; // Now TypeScript recognizes this as a string

    const db = initializeDb(c.env.DB);
    const userBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userid, userId)); // ✅ Fix: userId is now correctly typed

    return c.json({ bookings: userBookings }, 200);
  } catch (err) {
    console.error("Error fetching user bookings:", err);
    return c.json({ error: "Server error" }, 500);
  }
});

