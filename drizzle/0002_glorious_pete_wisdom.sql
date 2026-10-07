CREATE TABLE "workshop_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tailor_id" uuid NOT NULL,
	"customer_name" varchar(120) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"garment" varchar(120) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"stage" varchar(20) DEFAULT 'received' NOT NULL,
	"due_date" date NOT NULL,
	"fitting_date" date,
	"total" integer NOT NULL,
	"paid" integer DEFAULT 0 NOT NULL,
	"assignee" varchar(80) DEFAULT '' NOT NULL,
	"fabric" text DEFAULT '' NOT NULL,
	"fabric_location" varchar(80) DEFAULT '' NOT NULL,
	"measurements" text DEFAULT '' NOT NULL,
	"unit" varchar(2) DEFAULT 'in' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workshop_jobs" ADD CONSTRAINT "workshop_jobs_tailor_id_tailor_profiles_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_payments" ADD CONSTRAINT "workshop_payments_job_id_workshop_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."workshop_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workshop_jobs_tailor_due_idx" ON "workshop_jobs" USING btree ("tailor_id","due_date");--> statement-breakpoint
CREATE INDEX "workshop_payments_job_idx" ON "workshop_payments" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_payment_request_uq" ON "workshop_payments" USING btree ("request_id");