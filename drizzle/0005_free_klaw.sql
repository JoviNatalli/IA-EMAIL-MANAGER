-- pgvector: o Drizzle não gera o CREATE EXTENSION, mas sem ele o tipo
-- `vector` não existe e esta migração falha numa base de dados nova.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "email_embedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "google_event_id" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "google_html_link" text;--> statement-breakpoint
ALTER TABLE "email_embedding" ADD CONSTRAINT "email_embedding_email_id_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_embedding" ADD CONSTRAINT "email_embedding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_embedding" ADD CONSTRAINT "email_embedding_thread_id_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_embedding_chunk_idx" ON "email_embedding" USING btree ("email_id","chunk_index");--> statement-breakpoint
CREATE INDEX "email_embedding_user_idx" ON "email_embedding" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_embedding_vector_idx" ON "email_embedding" USING hnsw ("embedding" vector_cosine_ops);