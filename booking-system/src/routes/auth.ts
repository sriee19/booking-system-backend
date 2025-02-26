import { Hono } from "hono";
import { cors } from "hono/cors";
import { SignupSchema,LoginSchema } from "../validations/users";
import { generateToken } from "../utils/jwt";
import { initializeDb } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const authRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

authRoutes.use(
  "*",
  cors({
    origin: "http://localhost:3000", // Allow frontend to access backend
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow cookies if needed
  })
);


authRoutes.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, password } = SignupSchema.parse(body);

    console.log("Received data:", body);

    const db = initializeDb(c.env.DB);

    // Check if email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
    console.log("Existing User:", existingUser);

    if (existingUser) {
      return c.json({ error: "User already exists" }, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        uuid: crypto.randomUUID(),
        name,
        email,
        password: hashedPassword,
      })
      .returning();

    console.log("New User Inserted:", newUser);

    // const token = await generateToken({ uuid: newUser.uuid, role: newUser.role }, c.env.JWT_SECRET);
    return c.json({ message: "User registered successfully", newUser });
  } catch (err) {
    console.error("Signup Error:", err);
    return c.json({ error: "Invalid data or server error" }, 400);
  }
});


authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const { email, password } = LoginSchema.parse(body);

  const db = initializeDb(c.env.DB);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await generateToken({ uuid: user.uuid, role: user.role }, c.env.JWT_SECRET);
  return c.json({ token });
});