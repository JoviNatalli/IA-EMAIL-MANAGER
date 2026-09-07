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
import { semanticSearch } from "@/lib/search/semantic";

const requestSchema = z.object({
  query: z.string().min(3).max(500),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
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
