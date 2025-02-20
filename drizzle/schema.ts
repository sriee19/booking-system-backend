import { sqliteTable, AnySQLiteColumn, uniqueIndex, text } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const users = sqliteTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	role: text().default("user"),
},
(table) => [
	uniqueIndex("users_email_unique").on(table.email),
]);

