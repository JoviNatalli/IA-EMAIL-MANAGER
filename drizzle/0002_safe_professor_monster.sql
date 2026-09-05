CREATE TYPE "public"."gmail_sync_status" AS ENUM('idle', 'syncing', 'error');--> statement-breakpoint
CREATE TYPE "public"."thread_source" AS ENUM('demo', 'gmail');--> statement-breakpoint
CREATE TABLE "gmail_sync" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"history_id" text,
	"status" "gmail_sync_status" DEFAULT 'idle' NOT NULL,
	"last_synced_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "gmail_message_id" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "rfc_message_id" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "gmail_label_ids" jsonb;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "gmail_draft_id" text;--> statement-breakpoint
ALTER TABLE "label" ADD COLUMN "gmail_label_id" text;--> statement-breakpoint
ALTER TABLE "thread" ADD COLUMN "source" "thread_source" DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE "thread" ADD COLUMN "gmail_thread_id" text;--> statement-breakpoint
ALTER TABLE "gmail_sync" ADD CONSTRAINT "gmail_sync_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_gmail_message_idx" ON "email" USING btree ("gmail_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "label_user_gmail_label_idx" ON "label" USING btree ("user_id","gmail_label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "thread_user_gmail_thread_idx" ON "thread" USING btree ("user_id","gmail_thread_id");