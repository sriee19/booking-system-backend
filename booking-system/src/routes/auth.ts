import { Hono } from "hono";
import { cors } from "hono/cors";
import { SignupSchema, LoginSchema } from "../validations/users";
import { generateToken, verifyToken } from "../utils/jwt";
import { initializeDb } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt, { compare, hash } from "bcryptjs";

export const authRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

authRoutes.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    allowMethods: ["POST", "GET", "PUT", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

authRoutes.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, password } = SignupSchema.parse(body);

    const db = initializeDb(c.env.DB);
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get();

    if (existingUser) {
      return c.json({ error: "User already exists" }, 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({ uuid: crypto.randomUUID(), name, email, password: hashedPassword })
      .returning();

    return c.json({ message: "User registered successfully", newUser }, 201);
  } catch (err) {
    return c.json({ error: "Invalid data or server error" }, 400);
  }
});

authRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = LoginSchema.parse(body);
    const db = initializeDb(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const token = await generateToken({ uuid: user.uuid, role: user.role }, c.env.JWT_SECRET);
    return c.json({ token }, 200);
  } catch (err) {
    return c.json({ error: "Invalid request format" }, 400);
  }
});

authRoutes.put("/change-password", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const db = initializeDb(c.env.DB);
    const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.uuid, payload.uuid as string) });

    if (!user) return c.json({ error: "User not found" }, 404);
    const passwordMatch = await compare(currentPassword, user.password);
    if (!passwordMatch) return c.json({ error: "Incorrect current password" }, 403);

    const hashedNewPassword = await hash(newPassword, 10);
    await db.update(users).set({ password: hashedNewPassword }).where(eq(users.uuid, payload.uuid as string));

    return c.json({ message: "Password updated successfully" }, 200);
  } catch (err) {
    return c.json({ error: "Server error" }, 500);
  }
});

authRoutes.get("/user", async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const db = initializeDb(c.env.DB);
    const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.uuid, payload.uuid as string) });

    if (!user) return c.json({ error: "User not found" }, 404);

    return c.json({ uuid: user.uuid, name: user.name, email: user.email }, 200);
  } catch (err) {
    return c.json({ error: "Server error" }, 500);
  }
});
