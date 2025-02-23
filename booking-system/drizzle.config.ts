import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  migrations: {
    prefix: "timestamp",
  },
  dbCredentials: {
    url: "sqlite://./drizzle.sqlite",  // Change this to your database path
  },
});
