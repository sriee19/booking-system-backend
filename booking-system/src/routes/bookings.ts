import { Hono, Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { verify, JwtPayload } from "jsonwebtoken";
import { bookings } from "../../drizzle/schema";
import { z } from "zod";
import { getDB } from "../../drizzle/db";

// Define JWT Payload Type
interface AuthPayload extends JwtPayload {
  id: string;
  role: string;
}

// 🔹 Hono Router with Type Support
const bookingRouter = new Hono<{
  Variables: {
    user: AuthPayload;
  };
}>();

// 🔹 Authentication Middleware
const authMiddleware = async (c: Context, next: Next) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) throw new Error("JWT_SECRET is not set");

    const decoded = verify(token, secretKey) as AuthPayload;
    
    // ✅ Correct way to set user in context
    c.set("user", decoded);

    await next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Invalid token";
    return c.json({ error: errorMessage }, 401);
  }
};

// ✅ Book a Consultation
const bookingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  date: z.string().min(1, "Date is required"),
});

bookingRouter.post("/", authMiddleware, async (c) => {
  try {
    const db = getDB(c);
    const user = c.get("user"); // ✅ Correct way to get user from context
    if (!user || !user.id) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const { name, email, date } = bookingSchema.parse(body);

    await db.insert(bookings).values({
      id: crypto.randomUUID(),
      userId: user.id,
      name,
      email,
      date,
    });

    return c.json({ message: "Booking created successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create booking";
    return c.json({ error: errorMessage }, 400);
  }
});

// ✅ Get All User Bookings
bookingRouter.get("/", authMiddleware, async (c) => {
  try {
    const db = getDB(c);
    const user = c.get("user");
    if (!user || !user.id) return c.json({ error: "Unauthorized" }, 401);

    const results = await db.select().from(bookings).where(eq(bookings.userId, user.id));
    return c.json(results);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch bookings";
    return c.json({ error: errorMessage }, 500);
  }
});

// ✅ Delete a Booking
bookingRouter.delete("/:id", authMiddleware, async (c) => {
  try {
    const db = getDB(c);
    const { id } = c.req.param();

    const deleted = await db.delete(bookings).where(eq(bookings.id, id)).returning();
    if (deleted.length === 0) return c.json({ error: "Booking not found" }, 404);

    return c.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete booking";
    return c.json({ error: errorMessage }, 500);
  }
});

export default bookingRouter;
