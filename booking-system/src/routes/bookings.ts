import { Hono } from "hono";
import { cors } from "hono/cors";
import { CreateBookingSchema, UpdateBookingSchema } from "../validations/users";
import { initializeDb } from "../db";
import { bookings } from "../db/schema";
import { eq } from "drizzle-orm";
import { verifyToken, generateToken } from "../utils/jwt";

export const bookingRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

bookingRoutes.use("*", cors({
  origin: "http://localhost:3000", // Allow frontend domain
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies and authentication headers
}));

// Create Booking
bookingRoutes.post("/", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid token" }, 401);

  try {
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

    return c.json({ message: "Booking successful", booking: newBooking });
  } catch (err) {
    console.error("Booking error:", err);
    return c.json({ error: "Invalid data or server error" }, 400);
  }
});

// Update Booking
bookingRoutes.put("/:uid", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid token" }, 401);

  const uid = c.req.param("uid");
  const body = await c.req.json();
  const { status, paymentStatus } = UpdateBookingSchema.parse(body);

  const db = initializeDb(c.env.DB);
  const updatedBooking = await db
    .update(bookings)
    .set({
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bookings.uid, uid))
    .returning();

  if (!updatedBooking.length) {
    return c.json({ error: "Booking not found" }, 404);
  }

  // Generate JWT token
  const newToken = await generateToken({ uuid: payload.uuid, role: payload.role }, c.env.JWT_SECRET);
  return c.json({ token: newToken });
});

// Delete Booking
bookingRoutes.delete("/:uid", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid token" }, 401);

  const uid = c.req.param("uid");
  const db = initializeDb(c.env.DB);
  await db.delete(bookings).where(eq(bookings.uid, uid));

  // Generate JWT token
  const newToken = await generateToken({ uuid: payload.uuid, role: payload.role }, c.env.JWT_SECRET);
  return c.json({ token: newToken });
});

// Get All Bookings (Admin Only)
bookingRoutes.get("/", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid token" }, 401);

  if (payload.role !== "admin") {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  const db = initializeDb(c.env.DB);
  const allBookings = await db
    .select()
    .from(bookings);

  // Generate JWT token
  const newToken = await generateToken({ uuid: payload.uuid, role: payload.role }, c.env.JWT_SECRET);
  return c.json({ token: newToken, bookings: allBookings });
});