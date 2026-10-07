/** Creates a fresh test database and applies migrations before the suite runs. */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5432/dressify_test");
  const name = url.pathname.slice(1);
  const admin = postgres({ ...parse(url), database: "postgres", max: 1, onnotice: () => {} });
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  await admin.end();
  const client = postgres(url.toString(), { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
}

function parse(u: URL) {
  return { host: u.hostname, port: Number(u.port || 5432), username: decodeURIComponent(u.username || "postgres"), password: decodeURIComponent(u.password || "") || undefined };
}
