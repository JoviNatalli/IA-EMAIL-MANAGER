CREATE TYPE "public"."ai_category" AS ENUM('work', 'personal', 'finance', 'shopping', 'social', 'newsletter', 'meetings', 'important', 'promotional');--> statement-breakpoint
CREATE TYPE "public"."ai_sentiment" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
CREATE TABLE "ai_analysis" (
	"thread_id" uuid PRIMARY KEY NOT NULL,
	"category" "ai_category" NOT NULL,
	"priority" "thread_priority" NOT NULL,
	"requires_reply" boolean NOT NULL,
	"intent" text NOT NULL,
	"sentiment" "ai_sentiment" NOT NULL,
	"has_enough_information" boolean NOT NULL,
	"summary" text NOT NULL,
	"key_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_action" text,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_thread_id_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON DELETE cascade ON UPDATE no action;