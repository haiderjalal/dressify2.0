/**
 * Dressify database schema (PostgreSQL + Drizzle ORM).
 *
 * Conventions
 * - UUID primary keys (safe to expose, no enumeration).
 * - Money is stored as integer PKR (whole rupees).
 * - Every foreign key used in a WHERE clause has an index.
 * - Geo search uses the `earthdistance` extension with a GiST index
 *   (see drizzle/0001_geo_and_search.sql).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ─────────────────────────────── Enums ─────────────────────────────── */

export const userRole = pgEnum("user_role", ["customer", "tailor", "admin"]);
export const tailorStatus = pgEnum("tailor_status", ["pending", "approved", "suspended"]);
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "placed",
  "confirmed",
  "pickup_scheduled",
  "fabric_picked",
  "in_stitching",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);
export const paymentMethod = pgEnum("payment_method", ["easypaisa", "card", "cod"]);
export const paymentStatus = pgEnum("payment_status", [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refund_pending",
  "refunded",
]);
export const fabricSource = pgEnum("fabric_source", ["own", "store"]);
export const appointmentStatus = pgEnum("appointment_status", ["requested", "confirmed", "completed", "cancelled"]);
export const appointmentType = pgEnum("appointment_type", ["measurement", "consultation", "fitting"]);
export const appointmentMode = pgEnum("appointment_mode", ["at_shop", "home_visit"]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Counter orders are private to a shop and need no customer account. */
export const workshopJobs = pgTable("workshop_jobs", {
  id: uuid().primaryKey().defaultRandom(),
  tailorId: uuid().notNull().references(() => tailorProfiles.id, { onDelete: "cascade" }),
  customerName: varchar({ length: 120 }).notNull(),
  phone: varchar({ length: 20 }).notNull(),
  garment: varchar({ length: 120 }).notNull(),
  quantity: integer().notNull().default(1),
  stage: varchar({ length: 20 }).$type<import("@/lib/workshop").WorkshopStage>().notNull().default("received"),
  dueDate: date({ mode: "string" }).notNull(),
  fittingDate: date({ mode: "string" }),
  total: integer().notNull(),
  paid: integer().notNull().default(0),
  assignee: varchar({ length: 80 }).notNull().default(""),
  fabric: text().notNull().default(""),
  fabricLocation: varchar({ length: 80 }).notNull().default(""),
  measurements: text().notNull().default(""),
  unit: varchar({ length: 2 }).notNull().default("in"),
  notes: text().notNull().default(""),
  ...timestamps,
}, t => [index("workshop_jobs_tailor_due_idx").on(t.tailorId, t.dueDate)]);

export const workshopPayments = pgTable("workshop_payments", {
  id: uuid().primaryKey().defaultRandom(),
  jobId: uuid().notNull().references(() => workshopJobs.id, { onDelete: "cascade" }),
  requestId: uuid().notNull(),
  amount: integer().notNull(),
  method: varchar({ length: 20 }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, t => [index("workshop_payments_job_idx").on(t.jobId), uniqueIndex("workshop_payment_request_uq").on(t.requestId)]);

/* ─────────────────────────────── Users ─────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    role: userRole().notNull().default("customer"),
    name: varchar({ length: 120 }).notNull(),
    email: varchar({ length: 254 }).notNull(),
    phone: varchar({ length: 20 }),
    passwordHash: text().notNull(),
    avatarUrl: text(),
    locale: varchar({ length: 5 }).notNull().default("en"),
    /** Bump to revoke every existing session of this user. */
    sessionVersion: integer().notNull().default(1),
    isActive: boolean().notNull().default(true),
    lastLoginAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), uniqueIndex("users_phone_uq").on(t.phone), index("users_role_idx").on(t.role)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: varchar({ length: 40 }).notNull().default("Home"),
    line1: varchar({ length: 200 }).notNull(),
    area: varchar({ length: 120 }),
    city: varchar({ length: 80 }).notNull(),
    phone: varchar({ length: 20 }),
    lat: doublePrecision(),
    lng: doublePrecision(),
    isDefault: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/* ─────────────────────────────── Tailors ───────────────────────────── */

export const tailorProfiles = pgTable(
  "tailor_profiles",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shopName: varchar({ length: 120 }).notNull(),
    slug: varchar({ length: 140 }).notNull(),
    bio: text(),
    phone: varchar({ length: 20 }),
    city: varchar({ length: 80 }).notNull(),
    area: varchar({ length: 120 }),
    addressLine: varchar({ length: 200 }),
    lat: doublePrecision().notNull(),
    lng: doublePrecision().notNull(),
    /** men | women | kids */
    serves: text().array().notNull().default(sql`'{}'::text[]`),
    specialties: text().array().notNull().default(sql`'{}'::text[]`),
    /** Women empowerment: home-based, women-led ateliers get a badge and a dedicated filter. */
    isHomeBased: boolean().notNull().default(false),
    isWomenLed: boolean().notNull().default(false),
    offersHomeVisit: boolean().notNull().default(false),
    yearsExperience: smallint().notNull().default(0),
    /** Suits the tailor can start per working day (one slot = one order). */
    dailyCapacity: smallint().notNull().default(3),
    /** 0 = Sunday … 6 = Saturday */
    workingDays: smallint().array().notNull().default(sql`'{1,2,3,4,5,6}'::smallint[]`),
    priceFrom: integer().notNull().default(0),
    ratingSum: integer().notNull().default(0),
    ratingCount: integer().notNull().default(0),
    ordersCompleted: integer().notNull().default(0),
    status: tailorStatus().notNull().default("pending"),
    avatarUrl: text(),
    coverUrl: text(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("tailor_profiles_user_uq").on(t.userId),
    uniqueIndex("tailor_profiles_slug_uq").on(t.slug),
    index("tailor_profiles_status_city_idx").on(t.status, t.city),
    index("tailor_profiles_women_idx").on(t.isWomenLed).where(sql`${t.isWomenLed} = true`),
  ],
);

/** Per-date capacity override (e.g. closed on Eid → capacity 0). */
export const tailorDayOverrides = pgTable(
  "tailor_day_overrides",
  {
    tailorId: uuid()
      .notNull()
      .references(() => tailorProfiles.id, { onDelete: "cascade" }),
    day: date({ mode: "string" }).notNull(),
    capacity: smallint().notNull(),
  },
  (t) => [primaryKey({ columns: [t.tailorId, t.day] })],
);

/** Atomic slot counter — guarantees a tailor is never over-booked under concurrency. */
export const tailorSlotUsage = pgTable(
  "tailor_slot_usage",
  {
    tailorId: uuid()
      .notNull()
      .references(() => tailorProfiles.id, { onDelete: "cascade" }),
    day: date({ mode: "string" }).notNull(),
    used: smallint().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.tailorId, t.day] })],
);

export const designs = pgTable(
  "designs",
  {
    id: uuid().primaryKey().defaultRandom(),
    tailorId: uuid()
      .notNull()
      .references(() => tailorProfiles.id, { onDelete: "cascade" }),
    title: varchar({ length: 120 }).notNull(),
    description: text(),
    category: varchar({ length: 40 }).notNull(),
    /** men | women | kids */
    audience: varchar({ length: 10 }).notNull(),
    price: integer().notNull(),
    durationDays: smallint().notNull(),
    images: text().array().notNull().default(sql`'{}'::text[]`),
    /** Transparent front-view garment image used by camera try-on. */
    tryOnUrl: text(),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index("designs_tailor_idx").on(t.tailorId, t.isActive), index("designs_category_idx").on(t.category, t.audience)],
);

export const fabrics = pgTable(
  "fabrics",
  {
    id: uuid().primaryKey().defaultRandom(),
    tailorId: uuid()
      .notNull()
      .references(() => tailorProfiles.id, { onDelete: "cascade" }),
    name: varchar({ length: 120 }).notNull(),
    material: varchar({ length: 30 }).notNull(),
    colorName: varchar({ length: 40 }).notNull(),
    colorHex: varchar({ length: 7 }).notNull().default("#cccccc"),
    pricePerMeter: integer().notNull(),
    stockMeters: numeric({ precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    imageUrl: text(),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index("fabrics_tailor_idx").on(t.tailorId, t.isActive)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tailorId: uuid()
      .notNull()
      .references(() => tailorProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tailorId] })],
);

/* ─────────────────────────────── Customers ─────────────────────────── */

export type MeasurementValues = Record<string, number>;

export const measurementProfiles = pgTable(
  "measurement_profiles",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar({ length: 60 }).notNull(),
    /** men | women | kids — selects which measurement fields apply */
    gender: varchar({ length: 10 }).notNull(),
    values: jsonb().$type<MeasurementValues>().notNull(),
    notes: text(),
    ...timestamps,
  },
  (t) => [index("measurement_profiles_user_idx").on(t.userId)],
);

/* ─────────────────────────────── Orders ────────────────────────────── */

export type OrderAddress = {
  name: string;
  phone: string;
  line1: string;
  area?: string | null;
  city: string;
  lat?: number | null;
  lng?: number | null;
};
export type OrderMeasurements = { profileName: string; gender: string; values: MeasurementValues; notes?: string | null };
export type Rider = { name: string; phone: string; at?: string | null };

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    number: varchar({ length: 16 }).notNull(),
    customerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tailorId: uuid()
      .notNull()
      .references(() => tailorProfiles.id, { onDelete: "restrict" }),
    status: orderStatus().notNull(),
    fabricSource: fabricSource().notNull(),
    paymentMethod: paymentMethod().notNull(),
    paymentStatus: paymentStatus().notNull().default("unpaid"),
    slotDate: date({ mode: "string" }).notNull(),
    dueDate: date({ mode: "string" }).notNull(),
    measurements: jsonb().$type<OrderMeasurements>().notNull(),
    address: jsonb().$type<OrderAddress>().notNull(),
    notes: text(),
    stitchingTotal: integer().notNull(),
    fabricTotal: integer().notNull(),
    deliveryFee: integer().notNull(),
    total: integer().notNull(),
    commission: integer().notNull(),
    tailorPayout: integer().notNull(),
    pickupRider: jsonb().$type<Rider>(),
    deliveryRider: jsonb().$type<Rider>(),
    cancelledBy: userRole(),
    cancelReason: text(),
    deliveredAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.number),
    index("orders_customer_idx").on(t.customerId, t.createdAt.desc()),
    index("orders_tailor_idx").on(t.tailorId, t.status, t.createdAt.desc()),
    index("orders_status_created_idx").on(t.status, t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    designId: uuid().references(() => designs.id, { onDelete: "set null" }),
    title: varchar({ length: 120 }).notNull(),
    category: varchar({ length: 40 }).notNull(),
    price: integer().notNull(),
    quantity: smallint().notNull().default(1),
    fabricId: uuid().references(() => fabrics.id, { onDelete: "set null" }),
    fabricName: varchar({ length: 160 }),
    fabricMeters: numeric({ precision: 6, scale: 2, mode: "number" }),
    fabricPricePerMeter: integer(),
    lineTotal: integer().notNull(),
    notes: text(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatus().notNull(),
    note: text(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: varchar({ length: 20 }).notNull(),
    amount: integer().notNull(),
    status: paymentStatus().notNull().default("pending"),
    providerRef: varchar({ length: 160 }),
    payload: jsonb(),
    ...timestamps,
  },
  (t) => [index("payments_order_idx").on(t.orderId), index("payments_provider_ref_idx").on(t.provider, t.providerRef)],
);

/* ─────────────────────────────── Chat ──────────────────────────────── */

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    senderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text().notNull(),
    imageUrl: text(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_order_idx").on(t.orderId, t.createdAt)],
);

/* ─────────────────────────────── Notifications ─────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar({ length: 40 }).notNull(),
    data: jsonb().$type<Record<string, string | number | null>>().notNull().default({}),
    link: text(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt.desc())],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text().notNull(),
    p256dh: text().notNull(),
    auth: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("push_endpoint_uq").on(t.endpoint), index("push_user_idx").on(t.userId)],
);

/* ─────────────────────────────── Reviews & appointments ────────────── */

export const reviews = pgTable(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tailorId: uuid()
      .notNull()
      .references(() => tailorProfiles.id, { onDelete: "cascade" }),
    rating: smallint().notNull(),
    comment: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reviews_order_uq").on(t.orderId), index("reviews_tailor_idx").on(t.tailorId, t.createdAt.desc())],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid().primaryKey().defaultRandom(),
    customerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tailorId: uuid()
      .notNull()
      .references(() => tailorProfiles.id, { onDelete: "cascade" }),
    scheduledAt: timestamp({ withTimezone: true }).notNull(),
    type: appointmentType().notNull(),
    mode: appointmentMode().notNull(),
    status: appointmentStatus().notNull().default("requested"),
    notes: text(),
    addressText: varchar({ length: 240 }),
    ...timestamps,
  },
  (t) => [index("appointments_tailor_idx").on(t.tailorId, t.scheduledAt), index("appointments_customer_idx").on(t.customerId, t.scheduledAt)],
);

/* ─────────────────────────────── Tailor inventory ──────────────────── */

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    tailorId: uuid()
      .notNull()
      .references(() => tailorProfiles.id, { onDelete: "cascade" }),
    name: varchar({ length: 120 }).notNull(),
    /** thread | cloth | button | lining | zip | lace | needle | other */
    category: varchar({ length: 20 }).notNull(),
    /** spool | meter | piece | pack */
    unit: varchar({ length: 12 }).notNull(),
    quantity: numeric({ precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    lowStockAt: numeric({ precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    costPerUnit: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("inventory_items_tailor_idx").on(t.tailorId)],
);

export const inventoryLogs = pgTable(
  "inventory_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    itemId: uuid()
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    delta: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
    reason: varchar({ length: 120 }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inventory_logs_item_idx").on(t.itemId, t.createdAt.desc())],
);

/* ─────────────────────────────── Tailor community ──────────────────── */

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    authorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar({ length: 160 }).notNull(),
    body: text().notNull(),
    category: varchar({ length: 30 }).notNull(),
    replyCount: integer().notNull().default(0),
    isDeleted: boolean().notNull().default(false),
    lastActivityAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_posts_activity_idx").on(t.isDeleted, t.lastActivityAt.desc())],
);

export const forumReplies = pgTable(
  "forum_replies",
  {
    id: uuid().primaryKey().defaultRandom(),
    postId: uuid()
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    authorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text().notNull(),
    isDeleted: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_replies_post_idx").on(t.postId, t.createdAt)],
);

/* ─────────────────────────────── Types ─────────────────────────────── */

export type User = typeof users.$inferSelect;
export type TailorProfile = typeof tailorProfiles.$inferSelect;
export type Design = typeof designs.$inferSelect;
export type Fabric = typeof fabrics.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];
export type Role = (typeof userRole.enumValues)[number];
export type MeasurementProfile = typeof measurementProfiles.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
