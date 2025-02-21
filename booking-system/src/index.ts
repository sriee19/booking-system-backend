import { Hono } from "hono";
import authRouter from "./routes/auth";
import bookingRouter from "./routes/bookings";
import adminRouter from "./routes/admin";

const app = new Hono();

app.route("/auth", authRouter);
app.route("/bookings", bookingRouter);
app.route("/admin", adminRouter);

export default app;
