CREATE TABLE "calendar_sync" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sync_token" text,
	"last_synced_at" timestamp,
	"last_error" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preference" ADD COLUMN "time_zone" text;--> statement-breakpoint
ALTER TABLE "calendar_sync" ADD CONSTRAINT "calendar_sync_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;