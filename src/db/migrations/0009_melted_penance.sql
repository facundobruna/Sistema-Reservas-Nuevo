CREATE TABLE "mesa_block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"mesa_id" uuid NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mesa_block_mesa_id_date_key" UNIQUE("mesa_id","date")
);
--> statement-breakpoint
ALTER TABLE "mesa_block" ADD CONSTRAINT "mesa_block_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa_block" ADD CONSTRAINT "mesa_block_mesa_id_mesa_id_fk" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mesa_block_restaurant_id_date_idx" ON "mesa_block" USING btree ("restaurant_id","date");