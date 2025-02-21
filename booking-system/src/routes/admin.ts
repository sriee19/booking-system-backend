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

// 🔹 Admin Authentication Middleware
const adminMiddleware = async (c: Context, next: Next) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) throw new Error("JWT_SECRET is not set");

    const decoded = verify(token, secretKey) as AuthPayload;
    if (decoded.role !== "admin") return c.json({ error: "Forbidden" }, 403);

    c.set("user", decoded);
    await next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Invalid token";
    return c.json({ error: errorMessage }, 401);
  }
};

// 🔹 Admin Router
const adminRouter = new Hono();

// ✅ Get All Bookings (Admin)
adminRouter.get("/bookings", adminMiddleware, async (c) => {
  try {
    const db = getDB(c);
    const results = await db.select().from(bookings);
    return c.json(results);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch bookings";
    return c.json({ error: errorMessage }, 500);
  }
});

// ✅ Update Booking Status
const updateBookingSchema = z.object({
  status: z.string().min(1, "Status is required"),
});

adminRouter.put("/booking/:id", adminMiddleware, async (c) => {
  try {
    const db = getDB(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const { status } = updateBookingSchema.parse(body);

    const updated = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
    if (updated.length === 0) return c.json({ error: "Booking not found" }, 404);

    return c.json({ success: true, message: "Booking updated successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update booking";
    return c.json({ error: errorMessage }, 400);
  }
});

// ✅ Delete Booking (Admin)
adminRouter.delete("/booking/:id", adminMiddleware, async (c) => {
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

export default adminRouter;
