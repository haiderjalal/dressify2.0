import { z } from "zod";

/**
 * Validated server environment. Importing this module fails fast at boot if a
 * required variable is missing, instead of failing on the first request.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),

  PAYMENTS_MODE: z.enum(["test", "live"]).default("test"),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16),
  EASYPAISA_STORE_ID: z.string().optional(),
  EASYPAISA_HASH_KEY: z.string().optional(),
  EASYPAISA_CHECKOUT_URL: z.string().optional(),
  SAFEPAY_API_KEY: z.string().optional(),
  SAFEPAY_SECRET_KEY: z.string().optional(),
  SAFEPAY_WEBHOOK_SECRET: z.string().optional(),
  SAFEPAY_ENV: z.enum(["sandbox", "production"]).default("sandbox"),

  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:support@dressify.pk"),

  PUSHER_APP_ID: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().default("ap2"),

  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),

  CRON_SECRET: z.string().min(8).default("change-me-cron-secret"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
  throw new Error("Invalid environment variables — see .env.example");
}

const blank = (v?: string) => (v && v.trim() ? v : undefined);

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  features: {
    push: Boolean(blank(parsed.data.NEXT_PUBLIC_VAPID_PUBLIC_KEY) && blank(parsed.data.VAPID_PRIVATE_KEY)),
    pusher: Boolean(blank(parsed.data.PUSHER_APP_ID) && blank(parsed.data.PUSHER_SECRET) && blank(parsed.data.NEXT_PUBLIC_PUSHER_KEY)),
    redis: Boolean(blank(parsed.data.UPSTASH_REDIS_REST_URL) && blank(parsed.data.UPSTASH_REDIS_REST_TOKEN)),
    s3: Boolean(blank(parsed.data.S3_BUCKET) && blank(parsed.data.S3_ACCESS_KEY_ID) && blank(parsed.data.S3_SECRET_ACCESS_KEY)),
  },
};
