import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { sign } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { users } from "../../drizzle/schema";
import { z } from "zod";
import { getDB } from "../../drizzle/db";

// Initialize router
const authRouter = new Hono();

// Define validation schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// 🔹 Register User
authRouter.post("/register", async (c) => {
  try {
    const db = getDB(c);
    const body = await c.req.json();

    // Validate input
    const { email, password } = registerSchema.parse(body);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email,
      passwordHash: hashedPassword,
      role: "user",
    });

    return c.json({ message: "User registered successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return c.json({ error: errorMessage }, 400);
  }
});

// 🔹 Login User
authRouter.post("/login", async (c) => {
  try {
    const db = getDB(c);
    const body = await c.req.json();

    // Validate input
    const { email, password } = loginSchema.parse(body);

    // Find user
    const user = await db.select().from(users).where(eq(users.email, email)).get();

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Generate JWT token
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      throw new Error("JWT_SECRET is not set in environment variables");
    }

    const token = sign({ id: user.id, role: user.role }, secretKey, {
      expiresIn: "1h",
    });

    return c.json({ token });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return c.json({ error: errorMessage }, 400);
  }
});

export default authRouter;
