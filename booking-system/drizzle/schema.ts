import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Users Table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // 'user' or 'admin'
  createdAt: integer("created_at").default(Date.now()),
});

// Bookings Table
export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  date: text("date").notNull(),
  meetLink: text("meet_link"), // Optional
  status: text("status").default("pending"), // 'pending', 'confirmed', 'cancelled'
  createdAt: integer("created_at").default(Date.now()),
});
