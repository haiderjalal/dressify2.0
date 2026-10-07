CREATE TYPE "public"."appointment_mode" AS ENUM('at_shop', 'home_visit');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('requested', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('measurement', 'consultation', 'fitting');--> statement-breakpoint
CREATE TYPE "public"."fabric_source" AS ENUM('own', 'store');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'placed', 'confirmed', 'pickup_scheduled', 'fabric_picked', 'in_stitching', 'ready', 'out_for_delivery', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('easypaisa', 'card', 'cod');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'pending', 'paid', 'failed', 'refund_pending', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."tailor_status" AS ENUM('pending', 'approved', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'tailor', 'admin');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(40) DEFAULT 'Home' NOT NULL,
	"line1" varchar(200) NOT NULL,
	"area" varchar(120),
	"city" varchar(80) NOT NULL,
	"phone" varchar(20),
	"lat" double precision,
	"lng" double precision,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"tailor_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"type" "appointment_type" NOT NULL,
	"mode" "appointment_mode" NOT NULL,
	"status" "appointment_status" DEFAULT 'requested' NOT NULL,
	"notes" text,
	"address_text" varchar(240),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tailor_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text,
	"category" varchar(40) NOT NULL,
	"audience" varchar(10) NOT NULL,
	"price" integer NOT NULL,
	"duration_days" smallint NOT NULL,
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"try_on_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fabrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tailor_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"material" varchar(30) NOT NULL,
	"color_name" varchar(40) NOT NULL,
	"color_hex" varchar(7) DEFAULT '#cccccc' NOT NULL,
	"price_per_meter" integer NOT NULL,
	"stock_meters" numeric(10, 2) DEFAULT 0 NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"tailor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_tailor_id_pk" PRIMARY KEY("user_id","tailor_id")
);
--> statement-breakpoint
CREATE TABLE "forum_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"category" varchar(30) NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tailor_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" varchar(20) NOT NULL,
	"unit" varchar(12) NOT NULL,
	"quantity" numeric(10, 2) DEFAULT 0 NOT NULL,
	"low_stock_at" numeric(10, 2) DEFAULT 0 NOT NULL,
	"cost_per_unit" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"delta" numeric(10, 2) NOT NULL,
	"reason" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurement_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"gender" varchar(10) NOT NULL,
	"values" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"image_url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(40) NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"note" text,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"design_id" uuid,
	"title" varchar(120) NOT NULL,
	"category" varchar(40) NOT NULL,
	"price" integer NOT NULL,
	"quantity" smallint DEFAULT 1 NOT NULL,
	"fabric_id" uuid,
	"fabric_name" varchar(160),
	"fabric_meters" numeric(6, 2),
	"fabric_price_per_meter" integer,
	"line_total" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(16) NOT NULL,
	"customer_id" uuid NOT NULL,
	"tailor_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"fabric_source" "fabric_source" NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"slot_date" date NOT NULL,
	"due_date" date NOT NULL,
	"measurements" jsonb NOT NULL,
	"address" jsonb NOT NULL,
	"notes" text,
	"stitching_total" integer NOT NULL,
	"fabric_total" integer NOT NULL,
	"delivery_fee" integer NOT NULL,
	"total" integer NOT NULL,
	"commission" integer NOT NULL,
	"tailor_payout" integer NOT NULL,
	"pickup_rider" jsonb,
	"delivery_rider" jsonb,
	"cancelled_by" "user_role",
	"cancel_reason" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"amount" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"provider_ref" varchar(160),
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"tailor_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tailor_day_overrides" (
	"tailor_id" uuid NOT NULL,
	"day" date NOT NULL,
	"capacity" smallint NOT NULL,
	CONSTRAINT "tailor_day_overrides_tailor_id_day_pk" PRIMARY KEY("tailor_id","day")
);
--> statement-breakpoint
CREATE TABLE "tailor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"shop_name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"bio" text,
	"phone" varchar(20),
	"city" varchar(80) NOT NULL,
	"area" varchar(120),
	"address_line" varchar(200),
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"serves" text[] DEFAULT '{}'::text[] NOT NULL,
	"specialties" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_home_based" boolean DEFAULT false NOT NULL,
	"is_women_led" boolean DEFAULT false NOT NULL,
	"offers_home_visit" boolean DEFAULT false NOT NULL,
	"years_experience" smallint DEFAULT 0 NOT NULL,
	"daily_capacity" smallint DEFAULT 3 NOT NULL,
	"working_days" smallint[] DEFAULT '{1,2,3,4,5,6}'::smallint[] NOT NULL,
	"price_from" integer DEFAULT 0 NOT NULL,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"orders_completed" integer DEFAULT 0 NOT NULL,
	"status" "tailor_status" DEFAULT 'pending' NOT NULL,
	"avatar_url" text,
	"cover_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tailor_slot_usage" (
	"tailor_id" uuid NOT NULL,
	"day" date NOT NULL,
	"used" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "tailor_slot_usage_tailor_id_day_pk" PRIMARY KEY("tailor_id","day")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(20),
	"password_hash" text NOT NULL,
	"avatar_url" text,
	"locale" varchar(5) DEFAULT 'en' NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designs" ADD CONSTRAINT "designs_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabrics" ADD CONSTRAINT "fabrics_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_profiles" ADD CONSTRAINT "measurement_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_fabric_id_fabrics_id_fk" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailor_day_overrides" ADD CONSTRAINT "tailor_day_overrides_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailor_profiles" ADD CONSTRAINT "tailor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailor_slot_usage" ADD CONSTRAINT "tailor_slot_usage_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "appointments_tailor_idx" ON "appointments" USING btree ("tailor_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "appointments_customer_idx" ON "appointments" USING btree ("customer_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "designs_tailor_idx" ON "designs" USING btree ("tailor_id","is_active");--> statement-breakpoint
CREATE INDEX "designs_category_idx" ON "designs" USING btree ("category","audience");--> statement-breakpoint
CREATE INDEX "fabrics_tailor_idx" ON "fabrics" USING btree ("tailor_id","is_active");--> statement-breakpoint
CREATE INDEX "forum_posts_activity_idx" ON "forum_posts" USING btree ("is_deleted","last_activity_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "forum_replies_post_idx" ON "forum_replies" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_items_tailor_idx" ON "inventory_items" USING btree ("tailor_id");--> statement-breakpoint
CREATE INDEX "inventory_logs_item_idx" ON "inventory_logs" USING btree ("item_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "measurement_profiles_user_idx" ON "measurement_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_order_idx" ON "messages" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_uq" ON "orders" USING btree ("number");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_tailor_idx" ON "orders" USING btree ("tailor_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_provider_ref_idx" ON "payments" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "push_endpoint_uq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_order_uq" ON "reviews" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "reviews_tailor_idx" ON "reviews" USING btree ("tailor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "tailor_profiles_user_uq" ON "tailor_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tailor_profiles_slug_uq" ON "tailor_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tailor_profiles_status_city_idx" ON "tailor_profiles" USING btree ("status","city");--> statement-breakpoint
CREATE INDEX "tailor_profiles_women_idx" ON "tailor_profiles" USING btree ("is_women_led") WHERE "tailor_profiles"."is_women_led" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_uq" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");