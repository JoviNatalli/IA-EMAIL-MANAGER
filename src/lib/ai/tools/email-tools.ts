/**
 * Ferramentas de email do agente (spec §17).
 *
 * Nota de arquitetura: as ferramentas que ESCREVEM reutilizam as Server
 * Actions da Fase 2/3 (`src/app/actions/emails.ts`) em vez de falarem com a
 * base de dados diretamente. Isso é de propósito — essas actions já
 * revalidam a sessão, verificam ownership da thread, aplicam as regras de
 * negócio (não se arquiva um rascunho, só se apaga a partir do lixo) e
 * propagam a ação para o Gmail real quando a conta está ligada. Duplicar
 * essa lógica aqui seria a forma mais fácil de abrir um buraco de
 * segurança entre o que a UI faz e o que o agente faz.
 */
import { and, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import { z } from "zod";

import {
  moveThread,
  saveDraft,
  sendDraft,
  sendReply,
  setThreadLabel,
  setThreadRead,
  toggleThreadStar,
} from "@/app/actions/emails";
import { db } from "@/lib/db";
import { emails, threads } from "@/lib/db/schema";
import { getThread, listLabels, listThreads } from "@/lib/emails/queries";
import { getCachedThreadSummary, summarizeThreadForAgent } from "@/lib/ai/thread-summary";
import { ToolError, type AgentTool, type ToolContext } from "./types";

const MAX_RESULTS = 15;
const MAX_BULK_TARGETS = 25;

const threadIdSchema = z.string().uuid("Id de conversa inválido.");
const threadIdsSchema = z
  .array(threadIdSchema)
  .min(1, "Indica pelo menos uma conversa.")
  .max(MAX_BULK_TARGETS, `No máximo ${MAX_BULK_TARGETS} conversas de cada vez.`);

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Data inválida (usa ISO 8601, ex. 2026-09-05).");

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Carrega threads garantindo que TODAS pertencem ao utilizador da sessão.
 * O LLM pode inventar ou repetir ids: se algum não for do utilizador, a
 * ferramenta falha inteira em vez de agir sobre o subconjunto "válido"
 * (spec §29/§30).
 */
async function requireOwnedThreads(ctx: ToolContext, threadIds: string[]) {
  const unique = [...new Set(threadIds)];
  const rows = await db
    .select({ id: threads.id, subject: threads.subject, folder: threads.folder })
    .from(threads)
    .where(and(eq(threads.userId, ctx.userId), inArray(threads.id, unique)));

  if (rows.length !== unique.length) {
    const found = new Set(rows.map((r) => r.id));
    const missing = unique.filter((id) => !found.has(id));
    throw new ToolError(
      `Estas conversas não existem ou não pertencem a este utilizador: ${missing.join(", ")}. Usa searchEmails para obter ids válidos.`,
    );
  }
  return rows;
}

function formatThreadLine(item: {
  id: string;
  subject: string;
  folder: string;
  isRead: boolean;
  lastMessageAt: Date;
  messageCount: number;
  lastMessage: { fromName: string | null; fromEmail: string; snippet: string };
}): string {
  const from = item.lastMessage.fromName ?? item.lastMessage.fromEmail;
  const state = item.isRead ? "lida" : "NÃO LIDA";
  return `[id:${item.id}] ${item.lastMessageAt.toISOString().slice(0, 10)} · ${from} · "${item.subject}" · ${item.folder} · ${state} · ${item.messageCount} msg(s) · ${item.lastMessage.snippet.slice(0, 120)}`;
}

function formatThreadList(items: Parameters<typeof formatThreadLine>[0][], emptyMessage: string): string {
  if (items.length === 0) return emptyMessage;
  const shown = items.slice(0, MAX_RESULTS);
  const extra = items.length > shown.length ? `\n(+${items.length - shown.length} não listadas)` : "";
  return `${shown.length} conversa(s):\n${shown.map(formatThreadLine).join("\n")}${extra}`;
}

function bulkPreview(verb: string, count: number) {
  return { summary: `${verb} ${count} conversa(s).`, affectedCount: count };
}

// ── Ferramentas de leitura ──────────────────────────────────────────────

const searchEmails: AgentTool<{ query: string }> = {
  name: "searchEmails",
  description:
    "Pesquisa conversas de email do utilizador por texto (assunto, corpo, remetente). Devolve ids que podes usar noutras ferramentas.",
  schema: z.object({ query: z.string().min(1).max(200) }),
  kind: "read",
  confirmation: "never",
  async execute(ctx, args) {
    const items = await listThreads(ctx.userId, { type: "search", query: args.query });
    return { output: formatThreadList(items, `Nenhuma conversa encontrada para "${args.query}".`) };
  },
};

const findEmailsBySender: AgentTool<{ sender: string }> = {
  name: "findEmailsBySender",
  description: "Encontra conversas de um remetente (nome ou endereço de email, parcial serve).",
  schema: z.object({ sender: z.string().min(1).max(200) }),
  kind: "read",
  confirmation: "never",
  async execute(ctx, args) {
    const pattern = `%${args.sender}%`;
    const matching = await db
      .selectDistinct({ threadId: emails.threadId })
      .from(emails)
      .innerJoin(threads, eq(threads.id, emails.threadId))
      .where(
        and(
          eq(threads.userId, ctx.userId),
          or(ilike(emails.fromEmail, pattern), ilike(emails.fromName, pattern)),
        ),
      );

    const ids = matching.map((r) => r.threadId);
    if (ids.length === 0) return { output: `Nenhuma conversa de "${args.sender}".` };

    const rows = await db.query.threads.findMany({
      where: and(eq(threads.userId, ctx.userId), inArray(threads.id, ids)),
      orderBy: [desc(threads.lastMessageAt)],
      with: { emails: true },
    });

    const items = rows.map((row) => {
      const last = row.emails[row.emails.length - 1];
      return {
        id: row.id,
        subject: row.subject,
        folder: row.folder,
        isRead: row.isRead,
        lastMessageAt: row.lastMessageAt,
        messageCount: row.emails.length,
        lastMessage: {
          fromName: last?.fromName ?? null,
          fromEmail: last?.fromEmail ?? "",
          snippet: last?.snippet ?? "",
        },
      };
    });
    return { output: formatThreadList(items, `Nenhuma conversa de "${args.sender}".`) };
  },
};

const findEmailsByDate: AgentTool<{ after?: string; before?: string }> = {
  name: "findEmailsByDate",
  description:
    "Encontra conversas por intervalo de datas (ISO 8601). `after` e `before` são opcionais mas pelo menos um é preciso.",
  schema: z
    .object({ after: isoDateSchema.optional(), before: isoDateSchema.optional() })
    .refine((v) => v.after || v.before, "Indica pelo menos `after` ou `before`."),
  kind: "read",
  confirmation: "never",
  async execute(ctx, args) {
    const conditions = [eq(threads.userId, ctx.userId)];
    if (args.after) conditions.push(gte(threads.lastMessageAt, new Date(args.after)));
    if (args.before) conditions.push(lte(threads.lastMessageAt, new Date(args.before)));

    const rows = await db.query.threads.findMany({
      where: and(...conditions),
      orderBy: [desc(threads.lastMessageAt)],
      with: { emails: true },
    });

    const items = rows.map((row) => {
      const last = row.emails[row.emails.length - 1];
      return {
        id: row.id,
        subject: row.subject,
        folder: row.folder,
        isRead: row.isRead,
        lastMessageAt: row.lastMessageAt,
        messageCount: row.emails.length,
        lastMessage: {
          fromName: last?.fromName ?? null,
          fromEmail: last?.fromEmail ?? "",
          snippet: last?.snippet ?? "",
        },
      };
    });
    return { output: formatThreadList(items, "Nenhuma conversa nesse intervalo de datas.") };
  },
};

const getThreadTool: AgentTool<{ threadId: string }> = {
  name: "getThread",
  description: "Lê uma conversa completa (todas as mensagens) pelo id.",
  schema: z.object({ threadId: threadIdSchema }),
  kind: "read",
  confirmation: "never",
  async execute(ctx, args) {
    const thread = await getThread(ctx.userId, args.threadId);
    if (!thread) throw new ToolError("Conversa não encontrada (ou não pertence a este utilizador).");

    const body = thread.messages
      .map(
        (m, i) =>
          `[Mensagem ${i + 1} — de ${m.fromName ?? m.fromEmail} <${m.fromEmail}> em ${m.sentAt?.toISOString() ?? "(rascunho)"}]\n${m.bodyText.slice(0, 1500)}`,
      )
      .join("\n\n");

    return {
      output: `Assunto: ${thread.subject}\nPasta: ${thread.folder} · ${thread.isRead ? "lida" : "não lida"} · ${thread.isStarred ? "com estrela" : "sem estrela"}\nLabels: ${thread.labels.map((l) => l.name).join(", ") || "(nenhuma)"}\n\n${body}`,
    };
  },
};

const getEmail: AgentTool<{ emailId: string }> = {
  name: "getEmail",
  description: "Lê uma mensagem individual pelo id (o id de mensagem, não o da conversa).",
  schema: z.object({ emailId: z.string().uuid("Id de mensagem inválido.") }),
  kind: "read",
  confirmation: "never",
  async execute(ctx, args) {
    const [row] = await db
      .select({
        fromName: emails.fromName,
        fromEmail: emails.fromEmail,
        bodyText: emails.bodyText,
        sentAt: emails.sentAt,
        subject: threads.subject,
        threadId: threads.id,
      })
      .from(emails)
      .innerJoin(threads, eq(threads.id, emails.threadId))
      // O join com `threads` + filtro por `userId` é o que garante que não
      // se lê uma mensagem de outro utilizador só por adivinhar o uuid.
      .where(and(eq(emails.id, args.emailId), eq(threads.userId, ctx.userId)))
      .limit(1);

    if (!row) throw new ToolError("Mensagem não encontrada (ou não pertence a este utilizador).");
    return {
      output: `[conversa:${row.threadId}] Assunto: ${row.subject}\nDe: ${row.fromName ?? row.fromEmail} <${row.fromEmail}> em ${row.sentAt?.toISOString() ?? "(rascunho)"}\n\n${row.bodyText.slice(0, 4000)}`,
    };
  },
};

const summarizeThreadTool: AgentTool<{ threadId: string }> = {
  name: "summarizeThread",
  description: "Resume uma conversa inteira. Usa a análise já em cache quando existe, para poupar chamadas.",
  schema: z.object({ threadId: threadIdSchema }),
  kind: "read",
  confirmation: "never",
  async execute(ctx, args) {
    const cached = await getCachedThreadSummary(ctx.userId, args.threadId);
    if (cached) return { output: `${cached}\n(resumo já em cache)` };
    return { output: await summarizeThreadForAgent(ctx.userId, args.threadId) };
  },
};

// ── Ferramentas de escrita ──────────────────────────────────────────────

const markAsRead: AgentTool<{ threadIds: string[]; isRead?: boolean }> = {
  name: "markAsRead",
  description: "Marca conversas como lidas (ou não lidas, com isRead:false).",
  schema: z.object({ threadIds: threadIdsSchema, isRead: z.boolean().optional() }),
  kind: "write",
  confirmation: "bulk",
  async preview(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    return bulkPreview(args.isRead === false ? "Marcar como NÃO lidas" : "Marcar como lidas", rows.length);
  },
  async execute(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    const isRead = args.isRead ?? true;
    for (const row of rows) await setThreadRead(row.id, isRead);
    return { output: `${rows.length} conversa(s) marcada(s) como ${isRead ? "lidas" : "não lidas"}.` };
  },
};

const starEmail: AgentTool<{ threadIds: string[]; starred?: boolean }> = {
  name: "starEmail",
  description: "Adiciona estrela a conversas (ou remove, com starred:false).",
  schema: z.object({ threadIds: threadIdsSchema, starred: z.boolean().optional() }),
  kind: "write",
  confirmation: "bulk",
  async preview(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    return bulkPreview(args.starred === false ? "Remover estrela de" : "Adicionar estrela a", rows.length);
  },
  async execute(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    const starred = args.starred ?? true;
    for (const row of rows) await toggleThreadStar(row.id, starred);
    return { output: `Estrela ${starred ? "adicionada a" : "removida de"} ${rows.length} conversa(s).` };
  },
};

const archiveEmail: AgentTool<{ threadIds: string[] }> = {
  name: "archiveEmail",
  description: "Arquiva conversas (tira-as do inbox). Reversível.",
  schema: z.object({ threadIds: threadIdsSchema }),
  kind: "write",
  confirmation: "bulk",
  async preview(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    return bulkPreview("Arquivar", rows.length);
  },
  async execute(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    for (const row of rows) await moveThread(row.id, "archive");
    return { output: `${rows.length} conversa(s) arquivada(s).` };
  },
};

async function requireOwnLabel(ctx: ToolContext, labelName: string) {
  const available = await listLabels(ctx.userId);
  const match = available.find((l) => l.name.toLowerCase() === labelName.trim().toLowerCase());
  if (!match) {
    throw new ToolError(
      `Não existe nenhuma label chamada "${labelName}". Labels disponíveis: ${available.map((l) => l.name).join(", ") || "(nenhuma)"}.`,
    );
  }
  return match;
}

const addLabel: AgentTool<{ threadIds: string[]; labelName: string }> = {
  name: "addLabel",
  description: "Aplica uma label existente a conversas. Não cria labels novas.",
  schema: z.object({ threadIds: threadIdsSchema, labelName: z.string().min(1).max(40) }),
  kind: "write",
  confirmation: "bulk",
  async preview(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    const label = await requireOwnLabel(ctx, args.labelName);
    return { summary: `Aplicar a label "${label.name}" a ${rows.length} conversa(s).`, affectedCount: rows.length };
  },
  async execute(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    const label = await requireOwnLabel(ctx, args.labelName);
    for (const row of rows) await setThreadLabel(row.id, label.id, true);
    return { output: `Label "${label.name}" aplicada a ${rows.length} conversa(s).` };
  },
};

const removeLabel: AgentTool<{ threadIds: string[]; labelName: string }> = {
  name: "removeLabel",
  description: "Remove uma label de conversas.",
  schema: z.object({ threadIds: threadIdsSchema, labelName: z.string().min(1).max(40) }),
  kind: "write",
  confirmation: "bulk",
  async preview(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    const label = await requireOwnLabel(ctx, args.labelName);
    return { summary: `Remover a label "${label.name}" de ${rows.length} conversa(s).`, affectedCount: rows.length };
  },
  async execute(ctx, args) {
    const rows = await requireOwnedThreads(ctx, args.threadIds);
    const label = await requireOwnLabel(ctx, args.labelName);
    for (const row of rows) await setThreadLabel(row.id, label.id, false);
    return { output: `Label "${label.name}" removida de ${rows.length} conversa(s).` };
  },
};

const recipientSchema = z.object({
  email: z.string().email("Endereço de email inválido."),
  name: z.string().max(120).nullable().optional(),
});

const createDraft: AgentTool<{
  to: { email: string; name?: string | null }[];
  subject: string;
  body: string;
}> = {
  name: "createDraft",
  description:
    "Cria um rascunho de email (não envia). O utilizador pode editá-lo antes de enviar — usa isto sempre que não te pedirem explicitamente para ENVIAR.",
  schema: z.object({
    to: z.array(recipientSchema).min(1).max(20),
    subject: z.string().max(200),
    body: z.string().max(8000),
  }),
  kind: "write",
  // Um rascunho é inofensivo e revisível — não é "ação sensível" (§18).
  confirmation: "never",
  async execute(_ctx, args) {
    const result = await saveDraft({
      to: args.to.map((r) => ({ name: r.name ?? null, email: r.email })),
      cc: [],
      bcc: [],
      subject: args.subject,
      body: args.body,
    });
    return { output: `Rascunho criado (conversa ${result.threadId}). O utilizador tem de o rever e enviar.` };
  },
};

const sendEmail: AgentTool<{
  to: { email: string; name?: string | null }[];
  subject: string;
  body: string;
}> = {
  name: "sendEmail",
  description: "ENVIA um email. Irreversível — o utilizador tem sempre de confirmar antes.",
  schema: z.object({
    to: z.array(recipientSchema).min(1).max(20),
    subject: z.string().max(200),
    body: z.string().max(8000),
  }),
  kind: "write",
  confirmation: "always",
  async preview(_ctx, args) {
    const recipients = args.to.map((r) => r.email).join(", ");
    return {
      summary: `Enviar o email "${args.subject || "(sem assunto)"}" para ${recipients}.`,
      affectedCount: args.to.length,
    };
  },
  async execute(_ctx, args) {
    const result = await sendDraft({
      to: args.to.map((r) => ({ name: r.name ?? null, email: r.email })),
      cc: [],
      bcc: [],
      subject: args.subject,
      body: args.body,
    });
    return { output: `Email enviado para ${args.to.map((r) => r.email).join(", ")} (conversa ${result.threadId}).` };
  },
};

const replyToThread: AgentTool<{ threadId: string; body: string }> = {
  name: "replyToThread",
  description: "ENVIA uma resposta numa conversa existente. Irreversível — o utilizador confirma sempre.",
  schema: z.object({ threadId: threadIdSchema, body: z.string().min(1).max(8000) }),
  kind: "write",
  confirmation: "always",
  async preview(ctx, args) {
    const thread = await getThread(ctx.userId, args.threadId);
    if (!thread) throw new ToolError("Conversa não encontrada (ou não pertence a este utilizador).");
    return { summary: `Responder na conversa "${thread.subject}".`, affectedCount: 1 };
  },
  async execute(ctx, args) {
    const thread = await getThread(ctx.userId, args.threadId);
    if (!thread) throw new ToolError("Conversa não encontrada (ou não pertence a este utilizador).");

    const last = thread.messages[thread.messages.length - 1];
    if (!last) throw new ToolError("Esta conversa não tem mensagens para responder.");
    const to =
      last.fromEmail === ctx.userEmail
        ? last.to
        : [{ name: last.fromName, email: last.fromEmail }];

    await sendReply({ threadId: thread.id, to, cc: [], body: args.body });
    return { output: `Resposta enviada na conversa "${thread.subject}".` };
  },
};

export const emailTools = [
  searchEmails,
  findEmailsBySender,
  findEmailsByDate,
  getThreadTool,
  getEmail,
  summarizeThreadTool,
  markAsRead,
  starEmail,
  archiveEmail,
  addLabel,
  removeLabel,
  createDraft,
  sendEmail,
  replyToThread,
];
