import { Hono } from "hono";
import { SignupSchema, LoginSchema } from "../validations/users";
import { generateToken } from "../utils/jwt";
import { initializeDb } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const authRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

authRoutes.post("/signup", async (c) => {
  const body = await c.req.json();
  const { email, password } = SignupSchema.parse(body);

  const db = initializeDb(c.env.DB);
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const [newUser] = await db
      .insert(users)
      .values({
        uuid: crypto.randomUUID(),
        email,
        password: hashedPassword,
      })
      .returning();

    const token = await generateToken({ uuid: newUser.uuid, role: newUser.role }, c.env.JWT_SECRET);
    return c.json({ message: "User registered successfully", token });
  } catch (err) {
    return c.json({ error: "User already exists or invalid data" }, 400);
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