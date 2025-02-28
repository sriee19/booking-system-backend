import { Hono } from "hono";
import { cors } from "hono/cors";
import { UpdateUserSchema, LoginSchema, UpdateBookingSchema } from "../validations/users";
import { initializeDb } from "../db";
import { bookings, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { verifyToken, generateToken } from "../utils/jwt";
import bcrypt from "bcryptjs";

export const adminRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

adminRoutes.use(cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Handle OPTIONS requests manually
adminRoutes.options("*", (c) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  c.header("Access-Control-Allow-Credentials", "true");
  return c.body(null, 204);
});

// Create Admin User (Only for Initial Setup)
adminRoutes.post("/create", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const db = initializeDb(c.env.DB);
    const hashedPassword = await bcrypt.hash(password, 10);

    const [newAdmin] = await db
      .insert(users)
      .values({
        uuid: crypto.randomUUID(),
        email,
        password: hashedPassword,
        role: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    const token = await generateToken({ uuid: newAdmin.uuid, role: newAdmin.role }, c.env.JWT_SECRET);
    return c.json({ token });
  } catch (err) {
    return c.json({ error: "User already exists or invalid data" }, 409);
  }
});

// Login User/Admin
adminRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = LoginSchema.parse(body);

    const db = initializeDb(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const token = await generateToken({ uuid: user.uuid, role: user.role }, c.env.JWT_SECRET);
    return c.json({ token });
  } catch (err) {
    return c.json({ error: "Bad Request: Invalid data format" }, 400);
  }
});

// Delete User (Admin Only)
adminRoutes.delete("/:uuid", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    if (payload.role !== "admin") {
      return c.json({ error: "Forbidden: Admin access required" }, 403);
    }

    const uuid = c.req.param("uuid");
    const db = initializeDb(c.env.DB);
    const deleted = await db.delete(users).where(eq(users.uuid, uuid));

    if (!deleted) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ message: "User deleted successfully" });
  } catch (err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Update Booking
adminRoutes.put("/book/:uid", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const uid = c.req.param("uid");
    const body = await c.req.json();
    const { status } = UpdateBookingSchema.parse(body);

    const db = initializeDb(c.env.DB);
    const updatedBooking = await db
      .update(bookings)
      .set({
        status: status || undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(bookings.uid, uid))
      .returning();

    if (!updatedBooking.length) {
      return c.json({ error: "Booking not found" }, 404);
    }

    return c.json({ bookings: updatedBooking });
  } catch (err) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});


// Get All Users
adminRoutes.get("/users", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const db = initializeDb(c.env.DB);
    const allUsers = await db.select().from(users);

    return c.json({ bookings: allUsers }, 200);
  } catch (err) {
    return c.json({ error: "Server error" }, 500);
  }
});


adminRoutes.put("/:uuid", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const uuid = c.req.param("uuid"); // Ensure the correct param is used
    if (!uuid) return c.json({ error: "User ID is required" }, 400);

    const body = await c.req.json();
    const { name, email, role, phoneno } = UpdateUserSchema.parse(body); // Ensure `role` exists in schema

    const db = initializeDb(c.env.DB);
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.uuid, uuid))
      .then((rows) => rows[0]);

    if (!existingUser) return c.json({ error: "User not found" }, 404);
    if (existingUser.uuid !== payload.uuid) return c.json({ error: "Forbidden" }, 403);

    const updatedFields: any = { name, email, updatedAt: new Date().toISOString() };
    if (role) updatedFields.role = role;
    if (phoneno) updatedFields.phoneno = phoneno;

    const [updatedUser] = await db
      .update(users)
      .set(updatedFields)
      .where(eq(users.uuid, uuid))
      .returning();

    return c.json({ message: "User updated successfully", user: updatedUser }, 200);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Invalid data or server error";
    return c.json({ error: errorMessage }, 400);
  }
});
