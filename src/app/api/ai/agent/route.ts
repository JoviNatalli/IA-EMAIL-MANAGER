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
