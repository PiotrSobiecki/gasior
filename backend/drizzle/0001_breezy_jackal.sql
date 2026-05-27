CREATE TYPE "public"."batch_stage" AS ENUM('fermentacja-burzliwa', 'fermentacja-cicha', 'dojrzewanie', 'butelkowanie');--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"view_slug" text NOT NULL,
	"edit_code_hash" text NOT NULL,
	"name" text NOT NULL,
	"stage" "batch_stage" DEFAULT 'fermentacja-burzliwa' NOT NULL,
	"start_date" date NOT NULL,
	"recipe_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batches_view_slug_unique" UNIQUE("view_slug")
);
--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;