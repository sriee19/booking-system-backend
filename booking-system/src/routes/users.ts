import { Hono } from "hono";
import { UpdateUserSchema, LoginSchema } from "../validations/users";
import { initializeDb } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { verifyToken, generateToken } from "../utils/jwt";
import bcrypt from "bcryptjs";

export const userRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

// Create Admin User (Only for Initial Setup)
userRoutes.post("/admin", async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const db = initializeDb(c.env.DB);
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
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

    // Generate JWT token
    const token = await generateToken({ uuid: newAdmin.uuid, role: newAdmin.role }, c.env.JWT_SECRET);
    return c.json({ token });
  } catch (err) {
    return c.json({ error: "User already exists or invalid data" }, 400);
  }
});

// Create User (No Authentication Required)
userRoutes.post("/", async (c) => {
  const { email, password, role = "user" } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const db = initializeDb(c.env.DB);
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const [newUser] = await db
      .insert(users)
      .values({
        uuid: crypto.randomUUID(),
        email,
        password: hashedPassword,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    // Generate JWT token
    const token = await generateToken({ uuid: newUser.uuid, role: newUser.role }, c.env.JWT_SECRET);
    return c.json({ token });
  } catch (err) {
    return c.json({ error: "User already exists or invalid data" }, 400);
  }
});

// Login User/Admin
userRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const { email, password } = LoginSchema.parse(body);

  const db = initializeDb(c.env.DB);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Generate JWT token
  const token = await generateToken({ uuid: user.uuid, role: user.role }, c.env.JWT_SECRET);
  return c.json({ token });
});

// Update User (No Authentication Required)
userRoutes.put("/:uuid", async (c) => {
  const uuid = c.req.param("uuid");
  const body = await c.req.json();
  const { name, email, phoneno } = UpdateUserSchema.parse(body);

  const db = initializeDb(c.env.DB);
  await db
    .update(users)
    .set({
      name,
      email,
      phoneno,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.uuid, uuid));

  // Generate JWT token
  const token = await generateToken({ uuid, role: "user" }, c.env.JWT_SECRET);
  return c.json({ token });
});

// Delete User (Admin Only)
userRoutes.delete("/:uuid", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid token" }, 401);

  if (payload.role !== "admin") {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  const uuid = c.req.param("uuid");
  const db = initializeDb(c.env.DB);
  await db.delete(users).where(eq(users.uuid, uuid));

  // Generate JWT token
  const newToken = await generateToken({ uuid: payload.uuid, role: payload.role }, c.env.JWT_SECRET);
  return c.json({ token: newToken });
});

// Get All Users (Admin Only)
userRoutes.get("/", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid token" }, 401);

  if (payload.role !== "admin") {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  const db = initializeDb(c.env.DB);
  const allUsers = await db
    .select({
      uuid: users.uuid,
      email: users.email,
      status: users.status,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users);

  // Generate JWT token
  const newToken = await generateToken({ uuid: payload.uuid, role: payload.role }, c.env.JWT_SECRET);

  // Return token and user list
  return c.json({ token: newToken, users: allUsers });
});