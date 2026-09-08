/**
 * Resposta em linguagem natural sobre os emails encontrados (Fase 6, §27).
 *
 * O cliente envia apenas a PERGUNTA. As passagens são recuperadas outra vez
 * aqui, no servidor, em vez de virem no corpo do pedido: aceitar o contexto
 * do cliente deixaria qualquer pessoa injetar texto arbitrário no prompt e
 * ler emails que não são suas (§29/§31). Custa uma segunda pesquisa
 * vetorial — barata ao lado da chamada ao modelo que vem a seguir.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { AIError, AIProviderNotConfiguredError } from "@/lib/ai/errors";
import { streamRagAnswer } from "@/lib/ai/rag";
import { AI_SEARCH_LIMIT, checkRateLimit } from "@/lib/rate-limit";
import { semanticSearch } from "@/lib/search/semantic";

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

const requestSchema = z.object({
  query: z.string().min(3).max(500),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Rate limiting (spec §30): cada resposta gasta um embedding da pergunta
  // mais uma chamada ao modelo — é das rotas mais caras da app.
  const rate = checkRateLimit(AI_SEARCH_LIMIT, session.user.id);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Demasiadas pesquisas com IA seguidas. Aguarde um momento." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pergunta inválida." }, { status: 400 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        // Já indexado pela pesquisa que desenhou esta página.
        const { passages } = await semanticSearch(userId, parsed.data.query, {
          ensureIndexed: false,
        });

        if (passages.length === 0) {
          send("Não encontrei emails suficientemente relacionados com essa pergunta para responder.");
          return;
        }

        for await (const chunk of streamRagAnswer(userId, parsed.data.query, passages)) {
          send(chunk);
        }
      } catch (error) {
        const message =
          error instanceof AIProviderNotConfiguredError || error instanceof AIError
            ? error.userMessage
            : "Não foi possível responder agora. Tente novamente.";
        if (!(error instanceof AIError)) console.error("[rag] erro não mapeado:", error);
        send(`\n\n${message}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
