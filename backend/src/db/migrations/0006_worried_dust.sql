CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"superadmin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_restaurant_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"mp_preapproval_id" text,
	"trial_ends_at" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_restaurant_id_unique" UNIQUE("restaurant_id")
);
--> statement-breakpoint
CREATE TABLE "superadmin_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "superadmin_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "restaurant" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_superadmin_id_superadmin_user_id_fk" FOREIGN KEY ("superadmin_id") REFERENCES "public"."superadmin_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_target_restaurant_id_restaurant_id_fk" FOREIGN KEY ("target_restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_superadmin_id_idx" ON "audit_log" USING btree ("superadmin_id");--> statement-breakpoint
CREATE INDEX "audit_log_target_restaurant_id_idx" ON "audit_log" USING btree ("target_restaurant_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscription" USING btree ("status");