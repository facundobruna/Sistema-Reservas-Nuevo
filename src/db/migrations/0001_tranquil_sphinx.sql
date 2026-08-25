CREATE TYPE "public"."exception_kind" AS ENUM('closed', 'special_hours');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('scheduled', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('confirmation', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."reservation_source" AS ENUM('web', 'whatsapp', 'manual');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."seating_kind" AS ENUM('single', 'combo');--> statement-breakpoint
CREATE TYPE "public"."seating_mode" AS ENUM('rolling', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('owner', 'manager', 'host');--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"email" "citext",
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "customer_restaurant" (
	"restaurant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"no_show_count" integer DEFAULT 0 NOT NULL,
	"visit_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "customer_restaurant_restaurant_id_customer_id_pk" PRIMARY KEY("restaurant_id","customer_id")
);
--> statement-breakpoint
CREATE TABLE "mesa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"name" text NOT NULL,
	"min_capacity" integer DEFAULT 1 NOT NULL,
	"max_capacity" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mesa_capacity_check" CHECK ("mesa"."max_capacity" >= "mesa"."min_capacity")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"service_id" uuid,
	"seating_unit_id" uuid,
	"zone_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"party_size" integer NOT NULL,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"special_requests" text,
	"source" "reservation_source" DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_ends_at_check" CHECK ("reservation"."ends_at" > "reservation"."starts_at"),
	CONSTRAINT "reservation_party_size_check" CHECK ("reservation"."party_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "reservation_mesa" (
	"reservation_id" uuid NOT NULL,
	"mesa_id" uuid NOT NULL,
	"periodo" "tstzrange" NOT NULL,
	CONSTRAINT "reservation_mesa_reservation_id_mesa_id_pk" PRIMARY KEY("reservation_id","mesa_id")
);
--> statement-breakpoint
CREATE TABLE "restaurant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/Argentina/Buenos_Aires' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "schedule_exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"date" date NOT NULL,
	"kind" "exception_kind" NOT NULL,
	"start_time" time,
	"end_time" time,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seating_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "seating_kind" DEFAULT 'single' NOT NULL,
	"min_capacity" integer NOT NULL,
	"max_capacity" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seating_unit_capacity_check" CHECK ("seating_unit"."max_capacity" >= "seating_unit"."min_capacity")
);
--> statement-breakpoint
CREATE TABLE "seating_unit_mesa" (
	"seating_unit_id" uuid NOT NULL,
	"mesa_id" uuid NOT NULL,
	CONSTRAINT "seating_unit_mesa_seating_unit_id_mesa_id_pk" PRIMARY KEY("seating_unit_id","mesa_id")
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"zone_id" uuid,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"slot_interval_min" integer DEFAULT 15 NOT NULL,
	"turn_duration_min" integer DEFAULT 90 NOT NULL,
	"seating_mode" "seating_mode" DEFAULT 'rolling' NOT NULL,
	"fixed_times" time[],
	"pacing_cap" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shift_day_of_week_check" CHECK ("shift"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "shift_time_check" CHECK ("shift"."end_time" > "shift"."start_time")
);
--> statement-breakpoint
CREATE TABLE "staff_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"email" "citext" NOT NULL,
	"name" text NOT NULL,
	"role" "staff_role" DEFAULT 'host' NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_user_restaurant_id_email_key" UNIQUE("restaurant_id","email")
);
--> statement-breakpoint
CREATE TABLE "zone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_restaurant" ADD CONSTRAINT "customer_restaurant_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_restaurant" ADD CONSTRAINT "customer_restaurant_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa" ADD CONSTRAINT "mesa_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa" ADD CONSTRAINT "mesa_zone_id_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_seating_unit_id_seating_unit_id_fk" FOREIGN KEY ("seating_unit_id") REFERENCES "public"."seating_unit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_zone_id_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zone"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_mesa" ADD CONSTRAINT "reservation_mesa_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_mesa" ADD CONSTRAINT "reservation_mesa_mesa_id_mesa_id_fk" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exception" ADD CONSTRAINT "schedule_exception_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seating_unit" ADD CONSTRAINT "seating_unit_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seating_unit_mesa" ADD CONSTRAINT "seating_unit_mesa_seating_unit_id_seating_unit_id_fk" FOREIGN KEY ("seating_unit_id") REFERENCES "public"."seating_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seating_unit_mesa" ADD CONSTRAINT "seating_unit_mesa_mesa_id_mesa_id_fk" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_zone_id_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_user" ADD CONSTRAINT "staff_user_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone" ADD CONSTRAINT "zone_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_restaurant_customer_id_idx" ON "customer_restaurant" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "mesa_restaurant_id_idx" ON "mesa" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "mesa_zone_id_idx" ON "mesa" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "notification_reservation_id_idx" ON "notification" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "notification_scheduled_for_scheduled_idx" ON "notification" USING btree ("scheduled_for") WHERE "notification"."status" = 'scheduled';--> statement-breakpoint
CREATE INDEX "reservation_restaurant_id_starts_at_idx" ON "reservation" USING btree ("restaurant_id","starts_at");--> statement-breakpoint
CREATE INDEX "reservation_restaurant_id_status_idx" ON "reservation" USING btree ("restaurant_id","status");--> statement-breakpoint
CREATE INDEX "reservation_customer_id_idx" ON "reservation" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "reservation_service_id_idx" ON "reservation" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "reservation_seating_unit_id_idx" ON "reservation" USING btree ("seating_unit_id");--> statement-breakpoint
CREATE INDEX "reservation_zone_id_idx" ON "reservation" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "schedule_exception_restaurant_id_date_idx" ON "schedule_exception" USING btree ("restaurant_id","date");--> statement-breakpoint
CREATE INDEX "seating_unit_restaurant_id_idx" ON "seating_unit" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "seating_unit_mesa_mesa_id_idx" ON "seating_unit_mesa" USING btree ("mesa_id");--> statement-breakpoint
CREATE INDEX "service_restaurant_id_idx" ON "service" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "shift_restaurant_id_day_of_week_idx" ON "shift" USING btree ("restaurant_id","day_of_week");--> statement-breakpoint
CREATE INDEX "shift_service_id_idx" ON "shift" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "shift_zone_id_idx" ON "shift" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "zone_restaurant_id_idx" ON "zone" USING btree ("restaurant_id");