import { Hono } from "hono";
import { cors } from "hono/cors";
import { CreateBookingSchema, UpdateBookingSchema } from "../validations/users";
import { initializeDb } from "../db";
import { bookings } from "../db/schema";
import { eq } from "drizzle-orm";
import { verifyToken, generateToken } from "../utils/jwt";

export const bookingRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();


// ✅ Handle CORS globally
bookingRoutes.use(
  cors({
    origin: "*", // Allow all origins (for testing, later restrict it)
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow cookies and authentication headers
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600, // Cache the preflight response for 10 minutes
  })
);

// ✅ Explicitly handle OPTIONS requests for preflight
bookingRoutes.options("*", (c) => {
  return c.text("OK", 200);
});

// ✅ Create Booking Route
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

// Get All Bookings (For All Authenticated Users)
bookingRoutes.get("/book", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid token" }, 401);

  const db = initializeDb(c.env.DB);
  const allBookings = await db
    .select()
    .from(bookings)

  return c.json({ bookings: allBookings });
});

// Get Bookings for a Specific User (Sorted)
bookingRoutes.get("/user", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload || typeof payload.uuid !== "string") {
    return c.json({ error: "Invalid token or user ID" }, 401);
  }

  const db = initializeDb(c.env.DB);
  const userBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userid, payload.uuid))

  return c.json({ bookings: userBookings });
});


