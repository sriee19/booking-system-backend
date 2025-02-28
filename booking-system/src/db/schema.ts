import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Users Table
export const users = sqliteTable("users", {
  sno: integer("sno").primaryKey({ autoIncrement: true }), // Auto-incrementing primary key
  uuid: text("uuid").notNull().unique(), // Unique UUID for each user
  name: text("name"), // User's name
  email: text("email").unique().notNull(), // Unique email address
  phoneno: text("phoneno"), // User's phone number
  password: text("password").notNull(), // Hashed password
  status: integer("status", { mode: "boolean" }).default(true).notNull(), // User status (active/inactive)
  role: text("role").default("user").notNull(), // User role (admin/user)
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(), // Timestamp when the user was created
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(), // Timestamp when the user was last updated
});

// Bookings Table
export const bookings = sqliteTable("bookings", {
  sno: integer("sno").primaryKey({ autoIncrement: true }), // Auto-incrementing primary key
  uid: text("uid").notNull().unique(), // Unique UUID for each booking
  userid: text("userid").notNull(), // UUID of the user who created the booking
  name: text("name").notNull(), // Name of the person for the booking
  email: text("email").notNull(), // Email of the person for the booking
  calendarDate: text("calendar_date").notNull(), // Date of the booking
  fileurl: text("fileurl"), // URL of any associated file
  status: text("status").default("pending").notNull(), // Booking status (pending/confirmed/cancelled)
  paymentStatus: text("payment_status").default("unpaid").notNull(), // Payment status (unpaid/paid)
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(), // Timestamp when the booking was created
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(), // Timestamp when the booking was last updated
});