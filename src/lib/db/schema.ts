/**
 * Schema Drizzle — Fase 1 (Foundation)
 *
 * Contém apenas as entidades necessárias para autenticação + preferências.
 * As entidades de email/IA (Email, EmailThread, Label, Task, AIConversation, etc.)
 * entram nas Fases 2–5 conforme o roadmap em `mailmind-master-spec.md`.
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

// ── Relations ────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
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
