/**
 * Pesquisa semântica (Fase 6, spec §24/§27).
 *
 * Segunda metade do pipeline do §27: query → embedding → similarity search →
 * emails relevantes. A resposta do LLM por cima disto vive em
 * `src/lib/ai/rag.ts` — separado de propósito, porque encontrar os emails
 * certos é útil por si só (a UI mostra a lista mesmo que a resposta falhe).
 */
import "server-only";
import { and, cosineDistance, desc, eq, gt, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailEmbeddings, emails, threads } from "@/lib/db/schema";
import { embedQuery } from "@/lib/ai/embeddings";
import { indexPendingEmails } from "@/lib/ai/indexing";
import { listThreadsByIds, type ThreadListItem } from "@/lib/emails/queries";

/**
 * Corte absoluto: abaixo disto não há relação nenhuma com a pergunta.
 *
 * Uma pesquisa vetorial devolve SEMPRE os K mais próximos, mesmo quando nada
 * é relevante — sem corte, perguntar "emails sobre mergulho" numa caixa de
 * trabalho devolveria com confiança os oito emails menos irrelevantes.
 * 0.62 foi medido no dataset de seed: emails sem qualquer relação com a
 * pergunta assentam à volta de 0.60 e os acertos ficam em 0.65-0.74.
 */
const MIN_SIMILARITY = 0.62;
/**
 * Corte relativo ao melhor resultado.
 *
 * O corte absoluto sozinho não chega porque a escala desliza com a pergunta:
 * uma pergunta vaga baixa TODAS as semelhanças, uma específica sobe-as. O
 * que se mantém constante é a distância entre o que responde à pergunta e o
 * resto — daí manter apenas o que está perto do topo.
 */
const RELATIVE_WINDOW = 0.07;
/** Chunks a ler antes de agrupar por conversa (uma conversa gera vários). */
const CANDIDATE_CHUNKS = 40;
/** Conversas devolvidas ao utilizador. */
const MAX_THREADS = 8;

export interface SemanticPassage {
  threadId: string;
  emailId: string;
  /** Excerto que fez o match — é isto que a UI cita. */
  content: string;
  /** 0-1, quanto maior mais próximo. */
  score: number;
}

export interface SemanticSearchResult {
  threads: (ThreadListItem & { score: number; passage: string })[];
  /** Passagens em bruto, para o RAG usar como contexto. */
  passages: SemanticPassage[];
  /** Emails que ainda não estavam indexados quando a pesquisa correu. */
  pendingIndex: number;
}

/**
 * Pesquisa por significado, não por palavras.
 *
 * `ensureIndexed` indexa o que faltar antes de pesquisar: sem isto, a
 * primeira pesquisa numa caixa acabada de sincronizar devolveria vazio e
 * pareceria avariada. Fica opcional porque quem já indexou (o sync) não
 * precisa de pagar a verificação outra vez.
 */
export async function semanticSearch(
  userId: string,
  query: string,
  { ensureIndexed = true }: { ensureIndexed?: boolean } = {},
): Promise<SemanticSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return { threads: [], passages: [], pendingIndex: 0 };

  let pendingIndex = 0;
  if (ensureIndexed) {
    const result = await indexPendingEmails(userId);
    pendingIndex = result.remaining;
  }

  const queryVector = await embedQuery(trimmed);

  // `1 - distância` porque o pgvector devolve distância de cosseno (0 =
  // idêntico) e é mais fácil raciocinar sobre semelhança.
  const similarity = sql<number>`1 - (${cosineDistance(emailEmbeddings.embedding, queryVector)})`;

  const rows = await db
    .select({
      threadId: emailEmbeddings.threadId,
      emailId: emailEmbeddings.emailId,
      content: emailEmbeddings.content,
      score: similarity,
    })
    .from(emailEmbeddings)
    .innerJoin(threads, eq(threads.id, emailEmbeddings.threadId))
    .where(
      and(
        // Duas vezes o mesmo dono: na tabela de embeddings e na de threads.
        // Redundante hoje, mas o índice vetorial não sabe de ownership e
        // um bug de indexação não pode virar fuga de dados (spec §29).
        eq(emailEmbeddings.userId, userId),
        eq(threads.userId, userId),
        gt(similarity, MIN_SIMILARITY),
      ),
    )
    .orderBy(desc(similarity))
    .limit(CANDIDATE_CHUNKS);

  // Uma conversa pode aparecer em vários chunks; fica com o melhor.
  const bestByThread = new Map<string, SemanticPassage>();
  for (const row of rows) {
    const current = bestByThread.get(row.threadId);
    if (!current || row.score > current.score) {
      bestByThread.set(row.threadId, {
        threadId: row.threadId,
        emailId: row.emailId,
        content: row.content,
        score: row.score,
      });
    }
  }

  const ranked = [...bestByThread.values()].sort((a, b) => b.score - a.score);
  const cutoff = ranked.length > 0 ? ranked[0].score - RELATIVE_WINDOW : 0;
  const passages = ranked.filter((p) => p.score >= cutoff).slice(0, MAX_THREADS);

  const items = await listThreadsByIds(
    userId,
    passages.map((p) => p.threadId),
  );
  const passageByThread = new Map(passages.map((p) => [p.threadId, p]));

  return {
    threads: items.map((item) => ({
      ...item,
      score: passageByThread.get(item.id)?.score ?? 0,
      passage: passageByThread.get(item.id)?.content ?? "",
    })),
    passages,
    pendingIndex,
  };
}

/** Assunto + remetente de cada passagem, para citações legíveis no RAG. */
export async function describePassages(
  userId: string,
  passages: SemanticPassage[],
): Promise<{ passage: SemanticPassage; subject: string; from: string }[]> {
  if (passages.length === 0) return [];

  const rows = await db
    .select({
      emailId: emails.id,
      subject: threads.subject,
      fromName: emails.fromName,
      fromEmail: emails.fromEmail,
    })
    .from(emails)
    .innerJoin(threads, eq(threads.id, emails.threadId))
    .where(
      and(
        eq(threads.userId, userId),
        inArray(
          emails.id,
          passages.map((p) => p.emailId),
        ),
      ),
    );

  const byEmail = new Map(rows.map((row) => [row.emailId, row]));
  return passages.flatMap((passage) => {
    const row = byEmail.get(passage.emailId);
    if (!row) return [];
    return [{ passage, subject: row.subject, from: row.fromName ?? row.fromEmail }];
  });
}
