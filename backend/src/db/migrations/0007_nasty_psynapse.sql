ALTER TABLE "shift" DROP CONSTRAINT "shift_time_check";--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "buffer_min" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "overbooking_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_overbooking_percent_check" CHECK ("shift"."overbooking_percent" BETWEEN 0 AND 100);--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_buffer_min_check" CHECK ("shift"."buffer_min" >= 0);--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_time_check" CHECK ("shift"."end_time" <> "shift"."start_time");