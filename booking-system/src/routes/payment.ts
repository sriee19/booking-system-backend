import { Hono } from "hono";
import { PaymentSchema } from "../validations/payment";
import { initializeDb } from "../db";
import { bookings } from "../db/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "../utils/jwt";

// Define the Cashfree API response type
interface CashfreePaymentResponse {
  order_id: string;
  payment_session_id: string; // Session ID for payment gateway
  order_status: string;
  cf_order_id: string;
  order_token: string;
  order_amount: number;
  order_currency: string;
  order_note: string;
  customer_details: {
    customer_id: string;
    customer_email: string;
    customer_phone: string;
  };
}

export const paymentRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string; CASHFREE_APP_ID: string; CASHFREE_SECRET_KEY: string } }>();

// Generate a shorter order ID
const generateOrderId = (bookingUid: string) => {
  const uuidWithoutDashes = bookingUid.replace(/-/g, ""); // Remove dashes from UUID
  const timestamp = Date.now().toString().slice(-6); // Use last 6 digits of timestamp
  return `order_${uuidWithoutDashes}_${timestamp}`; // Combine UUID and timestamp
};

// Process Payment
paymentRoutes.post("/process", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid token" }, 401);

  const body = await c.req.json();
  const { bookingUid, amount } = PaymentSchema.parse(body);

  const db = initializeDb(c.env.DB);

  // Fetch the booking
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.uid, bookingUid))
    .limit(1);

  if (!booking) {
    return c.json({ error: "Booking not found" }, 404);
  }

  try {
    // Generate a shorter order ID
    const orderId = generateOrderId(bookingUid);

    // Call Cashfree API to create a payment order
    const cashfreeResponse = await fetch("https://sandbox.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": c.env.CASHFREE_APP_ID,
        "x-client-secret": c.env.CASHFREE_SECRET_KEY,
        "x-api-version": "2022-09-01",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        order_note: "Booking payment",
        customer_details: {
          customer_id: payload.uuid,
          customer_email: booking.email,
          customer_phone: "9999999999",
        },
      }),
    });

    if (!cashfreeResponse.ok) {
      const errorResponse = await cashfreeResponse.json();
      console.error("Cashfree API Error:", errorResponse);
      return c.json({ error: "Payment failed", details: errorResponse }, 400);
    }

    // Log the full response for debugging
    const paymentData = await cashfreeResponse.json() as CashfreePaymentResponse;
    console.log("Cashfree API Response:", paymentData);

    // Update booking payment status
    await db
      .update(bookings)
      .set({
        paymentStatus: "pending", // Set to pending until payment is confirmed
        updatedAt: new Date().toISOString(),
      })
      .where(eq(bookings.uid, bookingUid));

    // Return the payment session ID
    return c.json({
      message: "Payment session created successfully",
      paymentSessionId: paymentData.payment_session_id, // Use payment_session_id for redirection
    });
  } catch (err) {
    console.error("Payment processing error:", err);
    return c.json({ error: "Payment processing failed" }, 500);
  }
});