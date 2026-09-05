import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
  schemaFilter: ["admins", "alumni", "broadcasts", "push_subscriptions", "activity_logs"],
});
