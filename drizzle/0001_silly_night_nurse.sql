CREATE TYPE "public"."label_color" AS ENUM('slate', 'blue', 'green', 'amber', 'purple', 'rose');--> statement-breakpoint
CREATE TYPE "public"."thread_category" AS ENUM('work', 'personal', 'finance', 'updates', 'social', 'promotions');--> statement-breakpoint
CREATE TYPE "public"."thread_folder" AS ENUM('inbox', 'sent', 'drafts', 'archive', 'trash');--> statement-breakpoint
CREATE TYPE "public"."thread_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"from_name" text,
	"from_email" text NOT NULL,
	"to" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cc" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bcc" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"snippet" text DEFAULT '' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" "label_color" DEFAULT 'slate' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_label" (
	"thread_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	CONSTRAINT "thread_label_thread_id_label_id_pk" PRIMARY KEY("thread_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "thread" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"folder" "thread_folder" DEFAULT 'inbox' NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"is_read" boolean DEFAULT true NOT NULL,
	"priority" "thread_priority" DEFAULT 'medium' NOT NULL,
	"category" "thread_category",
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_email_id_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_thread_id_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label" ADD CONSTRAINT "label_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_label" ADD CONSTRAINT "thread_label_thread_id_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_label" ADD CONSTRAINT "thread_label_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread" ADD CONSTRAINT "thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_email_idx" ON "attachment" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "email_thread_idx" ON "email" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "label_user_idx" ON "label" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "thread_user_folder_idx" ON "thread" USING btree ("user_id","folder","last_message_at");