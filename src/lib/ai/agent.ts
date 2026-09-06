/**
 * Ciclo do AI Agent (Fase 5, spec §16-18, §59).
 *
 * Pipeline obrigatório por cada tool call, sem atalhos:
 *   LLM → validação de schema (Zod) → regras de negócio + ownership →
 *   decisão de confirmação (§18) → execução.
 * O modelo NUNCA fala com a base de dados: só devolve um nome de ferramenta
 * e um objeto de argumentos, que este módulo trata como input hostil.
 *
 * Duas decisões de desenho que valem a pena explicar:
 *
 * 1. Quando uma ação precisa de confirmação, o ciclo PARA. A ação fica
 *    guardada no servidor (`ai_pending_action`) e o utilizador decide. Não
 *    deixamos o modelo continuar a "raciocinar" como se já tivesse
 *    executado — era assim que ele acabaria a dizer "já arquivei os teus
 *    emails" antes de alguém ter confirmado seja o que for.
 *
 * 2. O histórico que o cliente envia é só texto (user/assistant). Os tool
 *    calls de turnos anteriores não são reencenados: o resultado deles já
 *    está resumido na resposta do assistente. Isso evita reenviar (e voltar
 *    a pagar) conteúdo de emails inteiros a cada mensagem nova, e evita
 *    confiar em blocos de tool call vindos do cliente.
 */
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { aiPendingActions, labels } from "@/lib/db/schema";
import { getFolderCounts } from "@/lib/emails/queries";
import { AIError } from "./errors";
import { buildAgentSystemPrompt, wrapToolResult } from "./prompts";
import { getAIProvider, type AIAgentMessage } from "./provider";
import { findAgentTool, getToolDefinitions, ToolError, type AgentUiPayload, type ToolContext } from "./tools";
import type { AnyAgentTool } from "./tools/types";

/** Passos máximos por pedido — trava de custo e de ciclos infinitos (spec §51). */
const MAX_STEPS = 6;
const PENDING_ACTION_TTL_MS = 15 * 60 * 1000;

export type AgentEvent =
  | { type: "step"; tool: string }
  | { type: "step_result"; tool: string; ok: boolean; summary: string }
  | { type: "ui"; payload: AgentUiPayload }
  | { type: "text"; text: string }
  | { type: "confirm"; actionId: string; toolName: string; summary: string; affectedCount: number }
  | { type: "error"; message: string }
  | { type: "done" };

export interface AgentTurnInput {
  ctx: ToolContext;
  /** Histórico de texto + a nova mensagem do utilizador. */
  history: { role: "user" | "assistant"; content: string }[];
  emit: (event: AgentEvent) => void;
}

async function buildSystemPrompt(ctx: ToolContext): Promise<string> {
  const [counts, userLabels] = await Promise.all([
    getFolderCounts(ctx.userId),
    db.select({ name: labels.name }).from(labels).where(eq(labels.userId, ctx.userId)),
  ]);

  return buildAgentSystemPrompt({
    userName: ctx.userName,
    userEmail: ctx.userEmail,
    now: new Date(),
    unreadCount: counts.inbox,
    importantCount: counts.important,
    draftsCount: counts.drafts,
    labelNames: userLabels.map((l) => l.name),
  });
}

/** Decide se esta chamada precisa de confirmação explícita (spec §18). */
async function resolveConfirmation(
  tool: AnyAgentTool,
  ctx: ToolContext,
  args: unknown,
): Promise<{ needed: boolean; summary: string; affectedCount: number }> {
  if (tool.confirmation === "never") return { needed: false, summary: "", affectedCount: 0 };

  if (!tool.preview) {
    // Defesa contra um erro de programação nosso: uma ferramenta sensível
    // sem `preview` não consegue dizer quantos itens afeta, e o §18 exige
    // essa contagem. Nesse caso é melhor falhar do que executar às cegas.
    throw new ToolError(`A ferramenta "${tool.name}" exige confirmação mas não sabe pré-visualizar o efeito.`);
  }

  const preview = await tool.preview(ctx, args);
  const needed = tool.confirmation === "always" || preview.affectedCount > 1;
  return { needed, summary: preview.summary, affectedCount: preview.affectedCount };
}

async function createPendingAction(
  ctx: ToolContext,
  toolName: string,
  args: unknown,
  summary: string,
  affectedCount: number,
): Promise<string> {
  const [row] = await db
    .insert(aiPendingActions)
    .values({
      userId: ctx.userId,
      toolName,
      // Já validados pelo Zod da ferramenta — mas na execução voltam a ser
      // validados, porque entretanto passaram por uma ida à base de dados.
      args: args as Record<string, unknown>,
      summary,
      affectedCount,
      expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS),
    })
    .returning({ id: aiPendingActions.id });
  return row.id;
}

/**
 * Executa um turno do agente. Devolve o texto final para o cliente poder
 * guardá-lo no histórico da conversa.
 */
export async function runAgentTurn({ ctx, history, emit }: AgentTurnInput): Promise<string> {
  const provider = getAIProvider();
  const system = await buildSystemPrompt(ctx);
  const tools = getToolDefinitions();

  const conversation: AIAgentMessage[] = history.map((m) => ({ role: m.role, content: m.content, toolCalls: [] }));
  let finalText = "";

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const result = await provider.generateWithTools({ tier: "agent", system, messages: conversation, tools });

    if (result.text.trim()) {
      finalText = result.text.trim();
      emit({ type: "text", text: finalText });
    }

    if (result.toolCalls.length === 0) return finalText;

    conversation.push({
      role: "assistant",
      content: result.text,
      toolCalls: result.toolCalls,
      providerState: result.providerState,
    });

    for (const call of result.toolCalls) {
      emit({ type: "step", tool: call.name });

      // 1. A ferramenta existe?
      const tool = findAgentTool(call.name);
      if (!tool) {
        const message = `A ferramenta "${call.name}" não existe. Ferramentas disponíveis: ${tools.map((t) => t.name).join(", ")}.`;
        emit({ type: "step_result", tool: call.name, ok: false, summary: "Ferramenta desconhecida." });
        conversation.push({ role: "tool", toolCallId: call.id, toolName: call.name, result: wrapToolResult(call.name, message) });
        continue;
      }

      // 2. Os argumentos do LLM passam no schema? (spec §58/§59)
      const parsed = tool.schema.safeParse(call.args);
      if (!parsed.success) {
        const message = `Argumentos inválidos para "${tool.name}": ${parsed.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`).join("; ")}`;
        emit({ type: "step_result", tool: tool.name, ok: false, summary: "Argumentos inválidos." });
        conversation.push({ role: "tool", toolCallId: call.id, toolName: tool.name, result: wrapToolResult(tool.name, message) });
        continue;
      }

      try {
        // 3 + 4. Regras de negócio/ownership (dentro de preview) e decisão
        // de confirmação (§18).
        const confirmation = await resolveConfirmation(tool, ctx, parsed.data);

        if (confirmation.needed) {
          const actionId = await createPendingAction(ctx, tool.name, parsed.data, confirmation.summary, confirmation.affectedCount);
          emit({
            type: "confirm",
            actionId,
            toolName: tool.name,
            summary: confirmation.summary,
            affectedCount: confirmation.affectedCount,
          });
          // O ciclo termina aqui de propósito — ver nota no topo do ficheiro.
          return finalText;
        }

        // 5. Execução (a ferramenta volta a verificar ownership por dentro).
        const toolResult = await tool.execute(ctx, parsed.data);
        emit({ type: "step_result", tool: tool.name, ok: true, summary: toolResult.output.split("\n")[0].slice(0, 120) });
        if (toolResult.ui) emit({ type: "ui", payload: toolResult.ui });
        conversation.push({
          role: "tool",
          toolCallId: call.id,
          toolName: tool.name,
          result: wrapToolResult(tool.name, toolResult.output),
        });
      } catch (error) {
        // Um erro esperado da ferramenta volta para o modelo (ele pode
        // corrigir-se); um erro do provider aborta o turno.
        if (error instanceof AIError) throw error;
        const message = error instanceof ToolError ? error.message : "A ferramenta falhou por um erro interno.";
        if (!(error instanceof ToolError)) {
          console.error(`[agent] falha inesperada na ferramenta ${tool.name}:`, error);
        }
        emit({ type: "step_result", tool: tool.name, ok: false, summary: message.slice(0, 120) });
        conversation.push({ role: "tool", toolCallId: call.id, toolName: tool.name, result: wrapToolResult(tool.name, `ERRO: ${message}`) });
      }
    }
  }

  const limitMessage = "Cheguei ao limite de passos para este pedido. Diz-me se queres que continue.";
  emit({ type: "text", text: limitMessage });
  return limitMessage;
}

// ── Confirmação de ações pendentes (spec §18) ───────────────────────────

export interface PendingActionResult {
  ok: boolean;
  message: string;
}

/**
 * Executa uma ação pendente depois do clique do utilizador.
 *
 * O cliente só envia o `actionId`: os argumentos vêm da base de dados, já
 * validados, e são revalidados aqui antes de executar. Nunca se aceita um
 * argumento vindo do cliente nesta fase — é a diferença entre "o utilizador
 * confirmou arquivar 3 emails" e "o cliente pediu para arquivar o que quis".
 */
export async function executePendingAction(ctx: ToolContext, actionId: string): Promise<PendingActionResult> {
  const action = await db.query.aiPendingActions.findFirst({
    where: and(eq(aiPendingActions.id, actionId), eq(aiPendingActions.userId, ctx.userId)),
  });
  if (!action) return { ok: false, message: "Ação não encontrada." };
  if (action.status !== "pending") return { ok: false, message: "Esta ação já foi resolvida." };
  if (action.expiresAt.getTime() < Date.now()) {
    await db.update(aiPendingActions).set({ status: "rejected", resolvedAt: new Date(), resultMessage: "Expirou." }).where(eq(aiPendingActions.id, action.id));
    return { ok: false, message: "Esta ação expirou. Peça de novo ao assistente." };
  }

  const tool = findAgentTool(action.toolName);
  if (!tool) return { ok: false, message: "A ação já não é suportada por esta versão da aplicação." };

  const parsed = tool.schema.safeParse(action.args);
  if (!parsed.success) {
    await db
      .update(aiPendingActions)
      .set({ status: "failed", resolvedAt: new Date(), resultMessage: "Argumentos inválidos." })
      .where(eq(aiPendingActions.id, action.id));
    return { ok: false, message: "Não foi possível executar: os dados da ação já não são válidos." };
  }

  try {
    const result = await tool.execute(ctx, parsed.data);
    await db
      .update(aiPendingActions)
      .set({ status: "executed", resolvedAt: new Date(), resultMessage: result.output.slice(0, 500) })
      .where(eq(aiPendingActions.id, action.id));
    return { ok: true, message: result.output };
  } catch (error) {
    const message =
      error instanceof ToolError
        ? error.message
        : error instanceof AIError
          ? error.userMessage
          : "Não foi possível executar a ação. Tente novamente.";
    if (!(error instanceof ToolError) && !(error instanceof AIError)) {
      console.error(`[agent] falha ao executar ação confirmada ${action.toolName}:`, error);
    }
    await db
      .update(aiPendingActions)
      .set({ status: "failed", resolvedAt: new Date(), resultMessage: message.slice(0, 500) })
      .where(eq(aiPendingActions.id, action.id));
    return { ok: false, message };
  }
}

export async function rejectPendingAction(ctx: ToolContext, actionId: string): Promise<PendingActionResult> {
  const result = await db
    .update(aiPendingActions)
    .set({ status: "rejected", resolvedAt: new Date(), resultMessage: "Cancelada pelo utilizador." })
    .where(and(eq(aiPendingActions.id, actionId), eq(aiPendingActions.userId, ctx.userId), eq(aiPendingActions.status, "pending")))
    .returning({ id: aiPendingActions.id });

  if (result.length === 0) return { ok: false, message: "Ação não encontrada ou já resolvida." };
  return { ok: true, message: "Ação cancelada." };
}
