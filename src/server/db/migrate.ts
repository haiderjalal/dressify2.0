/**
 * Applies SQL migrations in ./drizzle. Run with `npm run db:migrate`.
 * In CI/CD run this once per deploy, before the new app version receives traffic.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.end();
console.log("✓ Migrations applied");
