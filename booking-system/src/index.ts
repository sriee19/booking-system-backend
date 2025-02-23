import { Hono } from "hono";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { bookingRoutes } from "./routes/bookings";
import { paymentRoutes } from "./routes/payment";

const app = new Hono();

app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/bookings", bookingRoutes);
app.route("/payments", paymentRoutes); // Register payment routes

export default app;