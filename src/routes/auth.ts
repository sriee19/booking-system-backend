import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { z } from "zod";
import { env } from "hono/adapter";

const app = new Hono();
const prisma = new PrismaClient();


const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

app.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    console.log("1",body);
    
    const parsed = registerSchema.parse(body);
    console.log("4",parsed);
    
    // const SECRET_KEY = c.env.JWT_SECRET;
    const existingUser = await prisma.users.findUnique({
      where: { email: parsed.email },
    });
    if (existingUser) return c.json({ error: "User already exists" }, 400);

    const hashedPassword = await hash(parsed.password, 10);
console.log("2",hashedPassword);

    const user = await prisma.users.create({
      data: { email: parsed.email, password: hashedPassword, name: parsed.name },
    });
console.log("3",user);

    return c.json({ message: "User registered successfully", userId: user.id });
  } catch (error) {
    return c.json({ error: "Invalid data" }, 400);
  }
});

app.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = loginSchema.parse(body);
    const SECRET_KEY = c.env.JWT_SECRET;

    const user = await prisma.users.findUnique({ where: { email: parsed.email } });
    if (!user) return c.json({ error: "Invalid email or password" }, 401);

    const isValid = await compare(parsed.password, user.password);
    if (!isValid) return c.json({ error: "Invalid email or password" }, 401);

    const token = sign({ userId: user.id, email: user.email }, SECRET_KEY, {
      expiresIn: "1h",
    });

    return c.json({ message: "Login successful", token });
  } catch (error) {
    return c.json({ error: "Invalid credentials" }, 400);
  }
});

export default app;
