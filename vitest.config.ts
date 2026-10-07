import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5432/dressify_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DB,
      AUTH_SECRET: "test-secret-test-secret-test-secret-123456",
      PAYMENT_WEBHOOK_SECRET: "test-webhook-secret-123456",
      PAYMENTS_MODE: "test",
      DATABASE_POOL_MAX: "20",
    },
  },
});
