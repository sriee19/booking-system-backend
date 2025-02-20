import { Hono } from "hono";
import bookingsRouter from "./routes/bookings";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.route("/bookings", bookingsRouter);

export default app;
