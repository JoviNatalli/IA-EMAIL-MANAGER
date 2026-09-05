/**
 * AI Chat lateral (spec §25-26, §34) — streaming de texto puro (não JSON),
 * consumido pelo cliente com `response.body.getReader()`. Ainda não executa
 * ações (Fase 5) — só aconselha, com contexto real da app (§26 "minimum
 * necessary context": só as contagens de pastas, nunca o conteúdo dos
 * emails).
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getFolderCounts } from "@/lib/emails/queries";
import { AIError, AIProviderNotConfiguredError } from "@/lib/ai/errors";
import { buildChatSystemPrompt } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/provider";

const MAX_HISTORY_MESSAGES = 20;

const chatRequestSchema = z.object({
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
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const counts = await getFolderCounts(session.user.id);

  let provider;
  try {
    provider = getAIProvider();
  } catch (error) {
    const message = error instanceof AIProviderNotConfiguredError ? error.userMessage : "A IA não está disponível.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const system = buildChatSystemPrompt({
    unreadCount: counts.inbox,
    importantCount: counts.important,
    starredCount: counts.starred,
    draftsCount: counts.drafts,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.streamText({ tier: "chat", system, messages: parsed.data.messages, maxTokens: 1024 })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        const message = error instanceof AIError ? error.userMessage : "Ocorreu um erro ao falar com a IA.";
        controller.enqueue(encoder.encode(`\n\n[ERRO_IA]${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
