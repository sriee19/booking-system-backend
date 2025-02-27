import { Hono } from "hono";
import { authRoutes } from "./routes/auth";
import { bookingRoutes } from "./routes/bookings";
import {adminRoutes} from "./routes/admin";


const app = new Hono();

app.route("/auth", authRoutes);
app.route("/bookings", bookingRoutes);
app.route("/admin",adminRoutes)

export default app;