import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/** Non-destructive checks: use migrated DATABASE_URL; fixtures clean up only their own rows. */
export default defineConfig({
  resolve: { alias: {
    "@": fileURLToPath(new URL("./src", import.meta.url)),
    "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
  } },
  test: {
    environment: "node", include: ["tests/unit.test.ts", "tests/workshop*.test.ts"],
    fileParallelism: false, testTimeout: 30000, hookTimeout: 30000,
    env: { NODE_ENV: "test", DATABASE_POOL_MAX: "4" },
  },
});
