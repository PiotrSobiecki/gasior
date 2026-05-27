CREATE TYPE "public"."recipe_category" AS ENUM('wino', 'nalewka', 'cydr', 'miod');--> statement-breakpoint
CREATE TYPE "public"."recipe_status" AS ENUM('draft', 'validated');--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"fruit" text NOT NULL,
	"category" "recipe_category" NOT NULL,
	"fruit_kg" real NOT NULL,
	"sugar_kg" real NOT NULL,
	"water_l" real NOT NULL,
	"yeast_type" text NOT NULL,
	"target_abv" real NOT NULL,
	"fermentation_days" integer NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "recipe_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
