/**
 * Ferramentas de produtividade do agente: tarefas, lembretes, calendário
 * (spec §17, §20, §21).
 *
 * Distinção importante (spec §20/§21): `extractTasks` e `detectMeetings`
 * NUNCA escrevem — devolvem propostas que a UI mostra com botões
 * [Criar tarefa] / [Adicionar ao calendário]. Só o clique do utilizador (ou
 * um pedido explícito dele ao agente, que cai em `createTask`) grava alguma
 * coisa.
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { reminders, tasks, threads } from "@/lib/db/schema";
import { createCalendarEventForUser } from "@/lib/calendar/service";
import { buildMeetingExtractionPrompt, buildTaskExtractionPrompt } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/provider";
import { meetingExtractionSchema, taskExtractionSchema } from "@/lib/ai/schemas";
import { loadThreadForAI } from "@/lib/ai/thread-summary";
import { ToolError, type AgentTool, type ToolContext } from "./types";

const threadIdSchema = z.string().uuid("Id de conversa inválido.");
const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Data inválida (usa ISO 8601, ex. 2026-09-12T14:00:00Z).");

/** Um `sourceThreadId` vindo do LLM tem de ser provado como sendo do utilizador. */
async function resolveSourceThreadId(ctx: ToolContext, threadId?: string | null): Promise<string | null> {
  if (!threadId) return null;
  const row = await db.query.threads.findFirst({
    where: and(eq(threads.id, threadId), eq(threads.userId, ctx.userId)),
    columns: { id: true },
  });
  if (!row) throw new ToolError("A conversa de origem não existe ou não pertence a este utilizador.");
  return row.id;
}

async function requireThread(ctx: ToolContext, threadId: string) {
  const thread = await loadThreadForAI(ctx.userId, threadId);
  if (!thread) throw new ToolError("Conversa não encontrada (ou não pertence a este utilizador).");
  if (thread.messages.length === 0) throw new ToolError("Esta conversa não tem mensagens.");
  return thread;
}

const createTask: AgentTool<{ title: string; dueDate?: string | null; sourceThreadId?: string | null }> = {
  name: "createTask",
  description: "Cria uma tarefa para o utilizador. Usa só quando ele pedir explicitamente para criar/adicionar uma tarefa.",
  schema: z.object({
    title: z.string().min(1).max(160),
    dueDate: isoDateSchema.nullable().optional(),
    sourceThreadId: threadIdSchema.nullable().optional(),
  }),
  kind: "write",
  // Uma tarefa é local, reversível e foi pedida explicitamente — não é uma
  // ação sensível do §18.
  confirmation: "never",
  async execute(ctx, args) {
    const sourceThreadId = await resolveSourceThreadId(ctx, args.sourceThreadId);
    const [row] = await db
      .insert(tasks)
      .values({
        userId: ctx.userId,
        title: args.title,
        dueDate: args.dueDate ? new Date(args.dueDate) : null,
        sourceThreadId,
      })
      .returning({ id: tasks.id });
    return { output: `Tarefa criada: "${args.title}"${args.dueDate ? ` (prazo ${args.dueDate})` : ""} [id:${row.id}]` };
  },
};

const createReminder: AgentTool<{ title: string; remindAt: string; sourceThreadId?: string | null }> = {
  name: "createReminder",
  description: "Cria um lembrete com data/hora para o utilizador.",
  schema: z.object({
    title: z.string().min(1).max(160),
    remindAt: isoDateSchema,
    sourceThreadId: threadIdSchema.nullable().optional(),
  }),
  kind: "write",
  confirmation: "never",
  async execute(ctx, args) {
    const sourceThreadId = await resolveSourceThreadId(ctx, args.sourceThreadId);
    await db.insert(reminders).values({
      userId: ctx.userId,
      title: args.title,
      remindAt: new Date(args.remindAt),
      sourceThreadId,
    });
    return { output: `Lembrete criado: "${args.title}" para ${args.remindAt}.` };
  },
};

const createCalendarEvent: AgentTool<{
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  sourceThreadId?: string | null;
}> = {
  name: "createCalendarEvent",
  description:
    "Adiciona um evento ao calendário do Nuvoly. Usa só quando o utilizador pedir explicitamente para adicionar ao calendário.",
  schema: z.object({
    title: z.string().min(1).max(160),
    startsAt: isoDateSchema,
    endsAt: isoDateSchema.nullable().optional(),
    location: z.string().max(160).nullable().optional(),
    sourceThreadId: threadIdSchema.nullable().optional(),
  }),
  kind: "write",
  confirmation: "never",
  async execute(ctx, args) {
    const sourceThreadId = await resolveSourceThreadId(ctx, args.sourceThreadId);
    const result = await createCalendarEventForUser(ctx.userId, {
      title: args.title,
      startsAt: new Date(args.startsAt),
      endsAt: args.endsAt ? new Date(args.endsAt) : null,
      location: args.location ?? null,
      sourceThreadId,
    });

    // O modelo tem de saber ONDE o evento ficou, senão diz ao utilizador que
    // está no Google Calendar quando ficou só na app (spec §13).
    const where = result.googleHtmlLink
      ? "no Nuvoly e no Google Calendar"
      : result.googleError
        ? `no Nuvoly (não foi para o Google Calendar: ${result.googleError})`
        : "no Nuvoly (o Google Calendar não está ligado)";
    return { output: `Evento "${args.title}" criado ${where} para ${args.startsAt}.` };
  },
};

const extractTasks: AgentTool<{ threadId: string }> = {
  name: "extractTasks",
  description:
    "Deteta tarefas acionáveis numa conversa e devolve-as como PROPOSTAS (não cria nada). A aplicação mostra-as com um botão para o utilizador criar.",
  schema: z.object({ threadId: threadIdSchema }),
  kind: "read",
  confirmation: "never",
  async execute(ctx, args) {
    const thread = await requireThread(ctx, args.threadId);
    const provider = getAIProvider();
    const extraction = await provider.generateObject({
      tier: "classify",
      ...buildTaskExtractionPrompt(thread.subject, thread.messages, new Date()),
      schema: taskExtractionSchema,
      maxTokens: 700,
    });

    if (extraction.tasks.length === 0) {
      return { output: "Nenhuma tarefa clara nesta conversa." };
    }

    return {
      output: `${extraction.tasks.length} tarefa(s) proposta(s) ao utilizador (ainda NÃO criadas — ele tem de clicar para confirmar):\n${extraction.tasks
        .map((t) => `- ${t.title}${t.dueDate ? ` (prazo ${t.dueDate})` : " (sem prazo)"}`)
        .join("\n")}`,
      ui: {
        type: "taskProposals",
        items: extraction.tasks.map((t) => ({
          title: t.title,
          dueDate: t.dueDate,
          sourceThreadId: thread.id,
        })),
      },
    };
  },
};

const detectMeetings: AgentTool<{ threadId: string }> = {
  name: "detectMeetings",
  description:
    "Deteta reuniões/eventos mencionados numa conversa e devolve-os como PROPOSTAS (não adiciona ao calendário).",
  schema: z.object({ threadId: threadIdSchema }),
  kind: "read",
  confirmation: "never",
  async execute(ctx, args) {
    const thread = await requireThread(ctx, args.threadId);
    const provider = getAIProvider();
    const extraction = await provider.generateObject({
      tier: "classify",
      ...buildMeetingExtractionPrompt(thread.subject, thread.messages, new Date()),
      schema: meetingExtractionSchema,
      maxTokens: 700,
    });

    // O modelo devolve datas como texto: filtramos as que não são datas
    // reais em vez de as mostrar ao utilizador (spec §58 — nunca confiar).
    const valid = extraction.meetings.filter((m) => !Number.isNaN(Date.parse(m.startsAt)));
    if (valid.length === 0) {
      return { output: "Nenhuma reunião com data e hora identificáveis nesta conversa." };
    }

    return {
      output: `${valid.length} reunião(ões) proposta(s) ao utilizador (ainda NÃO adicionadas ao calendário):\n${valid
        .map((m) => `- ${m.title} em ${m.startsAt}${m.location ? ` (${m.location})` : ""}`)
        .join("\n")}`,
      ui: {
        type: "meetingProposals",
        items: valid.map((m) => ({
          title: m.title,
          startsAt: m.startsAt,
          endsAt: m.endsAt && !Number.isNaN(Date.parse(m.endsAt)) ? m.endsAt : null,
          location: m.location,
          sourceThreadId: thread.id,
        })),
      },
    };
  },
};

const listTasks: AgentTool<Record<string, never>> = {
  name: "listTasks",
  description: "Lista as tarefas por fazer do utilizador.",
  schema: z.object({}),
  kind: "read",
  confirmation: "never",
  async execute(ctx) {
    const rows = await db.query.tasks.findMany({
      where: and(eq(tasks.userId, ctx.userId), eq(tasks.isDone, false)),
      limit: 20,
    });
    if (rows.length === 0) return { output: "Sem tarefas por fazer." };
    return {
      output: rows
        .map((t) => `- ${t.title}${t.dueDate ? ` (prazo ${t.dueDate.toISOString().slice(0, 10)})` : ""}`)
        .join("\n"),
    };
  },
};

export const productivityTools = [
  createTask,
  createReminder,
  createCalendarEvent,
  extractTasks,
  detectMeetings,
  listTasks,
];
