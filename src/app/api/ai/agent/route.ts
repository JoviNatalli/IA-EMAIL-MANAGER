/**
 * AI Agent (Fase 5, spec §16-18) — um turno por pedido, com os eventos do
 * ciclo entregues em streaming como NDJSON (uma linha JSON por evento).
 *
 * Porquê NDJSON e não texto simples como o chat da Fase 4: aqui não há só
 * texto a chegar. Há passos ("a pesquisar emails..."), resultados de
 * ferramentas, propostas para a UI desenhar como cards e, sobretudo,
 * pedidos de confirmação (§18) que a UI tem de conseguir distinguir de
 * texto normal para mostrar os botões certos.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { runAgentTurn, type AgentEvent } from "@/lib/ai/agent";
import { AIError, AIProviderNotConfiguredError } from "@/lib/ai/errors";
import { AI_AGENT_LIMIT, checkRateLimit } from "@/lib/rate-limit";

/**
 * Teto de duração da função em serverless (Fase 8).
 *
 * Explícito de propósito: com Fluid Compute o default do Vercel são 300s,
 * mas num projeto onde o Fluid esteja desligado o default cai para 10s — e
 * um turno do agente já foi medido em ~40s quando teve de percorrer a
 * cadeia de modelos (ver docs/status.md, Fase 5). Sem isto, esses turnos
 * morriam a meio em produção; 60s é o teto do plano Hobby clássico e passa
 * nos dois modelos.
 */
export const maxDuration = 60;

const MAX_HISTORY_MESSAGES = 20;

const agentRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(MAX_HISTORY_MESSAGES),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Rate limiting (spec §30) — antes de ler o corpo: um pedido travado não
  // deve custar sequer o parse. Um turno do agente gasta várias chamadas ao
  // modelo, por isso o limite é mais apertado do que o da pesquisa.
  const rate = checkRateLimit(AI_AGENT_LIMIT, session.user.id);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos ao copiloto. Aguarde um momento e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = agentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const ctx = {
    userId: session.user.id,
    userEmail: session.user.email ?? "",
    userName: session.user.name ?? null,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      try {
        await runAgentTurn({ ctx, history: parsed.data.messages, emit: send });
      } catch (error) {
        const message =
          error instanceof AIProviderNotConfiguredError || error instanceof AIError
            ? error.userMessage
            : "Ocorreu um erro inesperado no assistente. Tente novamente.";
        if (!(error instanceof AIError)) console.error("[agent] erro não mapeado:", error);
        send({ type: "error", message });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
