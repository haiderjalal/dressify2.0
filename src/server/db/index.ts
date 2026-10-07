import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/server/env";

/**
 * One pooled connection per server instance. In development, Next.js hot
 * reloads modules, so the client is cached on globalThis to avoid leaking
 * connections. In production put PgBouncer / Neon pooler in front of Postgres
 * and keep DATABASE_POOL_MAX small per instance.
 */
const globalForDb = globalThis as unknown as { __dressifySql?: ReturnType<typeof postgres> };

const client =
  globalForDb.__dressifySql ??
  postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: env.DATABASE_URL.includes("pgbouncer=true") ? false : true,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__dressifySql = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };
