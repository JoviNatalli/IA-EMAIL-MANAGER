/**
 * Schema Drizzle
 *
 * Fase 1 (Foundation): autenticação + preferências.
 * Fase 2 (Email): threads, mensagens, labels, anexos — dataset de demo,
 * sem depender de Gmail real (isso é Fase 3). Os campos `priority` e
 * `category` já existem no schema porque fazem parte do wireframe da
 * Email List (§11), mas em Fase 2 são valores estáticos do seed — só
 * passam a ser calculados por IA na Fase 4. A UI não os apresenta como
 * "gerados por IA" enquanto isso não for verdade.
 * Entidades de IA/agentes (Task, AIConversation, etc.) entram nas Fases 4–5.
 */
import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  boolean,
  pgEnum,
  uuid,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Enums ────────────────────────────────────────────────────────────────

export const aiAssistanceLevelEnum = pgEnum("ai_assistance_level", [
  "minimal",
  "balanced",
  "proactive",
]);

export const focusAreaEnum = pgEnum("focus_area", [
  "work",
  "meetings",
  "clients",
  "finance",
  "personal",
  "projects",
]);

export const threadFolderEnum = pgEnum("thread_folder", [
  "inbox",
  "sent",
  "drafts",
  "archive",
  "trash",
]);

export const threadPriorityEnum = pgEnum("thread_priority", [
  "low",
  "medium",
  "high",
]);

export const threadCategoryEnum = pgEnum("thread_category", [
  "work",
  "personal",
  "finance",
  "updates",
  "social",
  "promotions",
]);

export const labelColorEnum = pgEnum("label_color", [
  "slate",
  "blue",
  "green",
  "amber",
  "purple",
  "rose",
]);

// Fase 3: origem de uma thread — "demo" (seed) ou "gmail" (sincronizada da
// conta Google real ligada via OAuth). Nunca misturado: threads de demo
// nunca são tocadas por uma sincronização real, e vice-versa.
export const threadSourceEnum = pgEnum("thread_source", ["demo", "gmail"]);

// Estado da sincronização com o Gmail por utilizador (spec §28 — "SyncState").
export const gmailSyncStatusEnum = pgEnum("gmail_sync_status", [
  "idle",
  "syncing",
  "error",
]);

// Fase 4 — categorias da análise de IA (spec §22). Conjunto próprio,
// distinto do `threadCategoryEnum` acima: aquele é o placeholder estático do
// seed da Fase 2 (nunca apresentado como IA); este é o output real do
// classificador (`src/lib/ai/schemas.ts`).
export const aiCategoryEnum = pgEnum("ai_category", [
  "work",
  "personal",
  "finance",
  "shopping",
  "social",
  "newsletter",
  "meetings",
  "important",
  "promotional",
]);

export const aiSentimentEnum = pgEnum("ai_sentiment", [
  "positive",
  "neutral",
  "negative",
]);

// ── Users & Auth (compatível com o Drizzle Adapter do Auth.js) ────────────

export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Apenas para o Credentials provider de demo (Fase 1).
  // Em produção, a autenticação real passa a ser OAuth (Google) na Fase 3.
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ── Preferências de utilizador (onboarding) ────────────────────────────────

export const userPreferences = pgTable("user_preference", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  focusAreas: jsonb("focus_areas").$type<
    (typeof focusAreaEnum.enumValues)[number][]
  >(),
  aiAssistanceLevel: aiAssistanceLevelEnum("ai_assistance_level")
    .notNull()
    .default("balanced"),
  autoCategorization: boolean("auto_categorization").notNull().default(true),
  priorityDetection: boolean("priority_detection").notNull().default(true),
  dailyBriefing: boolean("daily_briefing").notNull().default(true),
  smartReplySuggestions: boolean("smart_reply_suggestions")
    .notNull()
    .default(true),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    mode: "date",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Email (Fase 2) ──────────────────────────────────────────────────────

// Um "participante" de email (remetente ou um dos destinatários). Usado em
// jsonb para to/cc/bcc — evita uma tabela de contactos que a Fase 2 não
// precisa (entra se/quando fizer sentido, ex. Fase 3 com Gmail real).
export interface EmailParticipant {
  name: string | null;
  email: string;
}

export const threads = pgTable(
  "thread",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    folder: threadFolderEnum("folder").notNull().default("inbox"),
    isStarred: boolean("is_starred").notNull().default(false),
    isRead: boolean("is_read").notNull().default(true),
    priority: threadPriorityEnum("priority").notNull().default("medium"),
    category: threadCategoryEnum("category"),
    // Fase 3: "demo" (seed, nunca tocado por sync real) ou "gmail" (linha
    // espelha uma thread real, identificada por `gmailThreadId`).
    source: threadSourceEnum("source").notNull().default("demo"),
    gmailThreadId: text("gmail_thread_id"),
    // Denormalizado para ordenar a lista sem agregar `email` a cada render.
    lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("thread_user_folder_idx").on(t.userId, t.folder, t.lastMessageAt),
    // Permite `null` em várias linhas (Postgres trata NULLs como distintos) —
    // só impede duplicar a mesma thread do Gmail para o mesmo utilizador.
    uniqueIndex("thread_user_gmail_thread_idx").on(t.userId, t.gmailThreadId),
  ],
);

export const emails = pgTable(
  "email",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    fromName: text("from_name"),
    fromEmail: text("from_email").notNull(),
    to: jsonb("to").$type<EmailParticipant[]>().notNull().default([]),
    cc: jsonb("cc").$type<EmailParticipant[]>().notNull().default([]),
    bcc: jsonb("bcc").$type<EmailParticipant[]>().notNull().default([]),
    bodyText: text("body_text").notNull().default(""),
    snippet: text("snippet").notNull().default(""),
    // NULL para threads "demo" (Fase 2, envio simulado). Para threads
    // "gmail" passa a ter sentAt real assim que a Gmail API confirma o envio.
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // Fase 3 — mapeamento para a mensagem real no Gmail (null para "demo").
    gmailMessageId: text("gmail_message_id"),
    // Header Message-ID (RFC 822) da mensagem — necessário para threading
    // correto (In-Reply-To/References) quando respondemos via Gmail API.
    rfcMessageId: text("rfc_message_id"),
    // Snapshot dos labelIds devolvidos pela Gmail API na última sincronização
    // — usado para derivar folder/estrela/lido e para diffs futuros.
    gmailLabelIds: jsonb("gmail_label_ids").$type<string[]>(),
    // Id do rascunho no Gmail (`users.drafts`), para fazer update em vez de
    // duplicar a cada autosave.
    gmailDraftId: text("gmail_draft_id"),
  },
  (t) => [
    index("email_thread_idx").on(t.threadId),
    uniqueIndex("email_gmail_message_idx").on(t.gmailMessageId),
  ],
);

export const attachments = pgTable(
  "attachment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailId: uuid("email_id")
      .notNull()
      .references(() => emails.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
  },
  (t) => [index("attachment_email_idx").on(t.emailId)],
);

export const labels = pgTable(
  "label",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: labelColorEnum("color").notNull().default("slate"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // Fase 3 — preenchido quando esta label foi importada do Gmail (permite
    // aplicar/remover a label na conta real). Labels criadas só localmente
    // ficam com isto a null — ainda não sincronizamos criação de labels
    // novas de volta para o Gmail (ver README "Future Improvements").
    gmailLabelId: text("gmail_label_id"),
  },
  (t) => [
    index("label_user_idx").on(t.userId),
    uniqueIndex("label_user_gmail_label_idx").on(t.userId, t.gmailLabelId),
  ],
);

export const threadLabels = pgTable(
  "thread_label",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.threadId, t.labelId] })],
);

// Estado de sincronização Gmail por utilizador (spec §28 "SyncState") — uma
// linha por utilizador com conta Google ligada. `historyId` é o cursor da
// Gmail History API (`users.history.list`) para sincronizações incrementais
// depois da sincronização inicial completa.
export const gmailSync = pgTable("gmail_sync", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  historyId: text("history_id"),
  status: gmailSyncStatusEnum("status").notNull().default("idle"),
  lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
  // Mensagem amigável (nunca o erro técnico cru — spec §35), guardada para
  // mostrar na UI de Connected Accounts se a última sincronização falhou.
  lastError: text("last_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── AI Analysis (Fase 4) ────────────────────────────────────────────────

// Cache da análise de IA de uma thread (spec §28 "AIAnalysis") — evita
// rechamar o LLM sempre que a thread é reaberta (spec §51, controlo de
// custo). Uma linha por thread; recalculada sob pedido explícito do
// utilizador ("Analisar com IA"), nunca automaticamente em cada view.
export const aiAnalysis = pgTable("ai_analysis", {
  threadId: uuid("thread_id")
    .primaryKey()
    .references(() => threads.id, { onDelete: "cascade" }),
  category: aiCategoryEnum("category").notNull(),
  priority: threadPriorityEnum("priority").notNull(),
  requiresReply: boolean("requires_reply").notNull(),
  intent: text("intent").notNull(),
  sentiment: aiSentimentEnum("sentiment").notNull(),
  hasEnoughInformation: boolean("has_enough_information").notNull(),
  summary: text("summary").notNull(),
  keyPoints: jsonb("key_points").$type<string[]>().notNull().default([]),
  suggestedAction: text("suggested_action"),
  // Modelo que gerou esta análise — útil para invalidar cache ao trocar de
  // modelo/provider e para observability (spec §50).
  model: text("model").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiAnalysisRelations = relations(aiAnalysis, ({ one }) => ({
  thread: one(threads, { fields: [aiAnalysis.threadId], references: [threads.id] }),
}));

// ── Relations ────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  gmailSync: one(gmailSync, {
    fields: [users.id],
    references: [gmailSync.userId],
  }),
  threads: many(threads),
  labels: many(labels),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  user: one(users, { fields: [threads.userId], references: [users.id] }),
  emails: many(emails),
  threadLabels: many(threadLabels),
  aiAnalysis: one(aiAnalysis, { fields: [threads.id], references: [aiAnalysis.threadId] }),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
  thread: one(threads, {
    fields: [emails.threadId],
    references: [threads.id],
  }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  email: one(emails, { fields: [attachments.emailId], references: [emails.id] }),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  user: one(users, { fields: [labels.userId], references: [users.id] }),
  threadLabels: many(threadLabels),
}));

export const threadLabelsRelations = relations(threadLabels, ({ one }) => ({
  thread: one(threads, {
    fields: [threadLabels.threadId],
    references: [threads.id],
  }),
  label: one(labels, {
    fields: [threadLabels.labelId],
    references: [labels.id],
  }),
}));

export const gmailSyncRelations = relations(gmailSync, ({ one }) => ({
  user: one(users, { fields: [gmailSync.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
  }),
);
