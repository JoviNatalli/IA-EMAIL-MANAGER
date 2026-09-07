/**
 * Indexação incremental dos emails para pesquisa semântica (Fase 6, §27).
 *
 * DECISÃO — quando é que isto corre (a pergunta que o âmbito da fase deixou
 * em aberto: síncrono no fim do sync, ou fila/job?).
 *
 * Nenhuma das duas, e a razão é o ambiente real deste projeto:
 *  - Síncrono no fim do sync do Gmail bloquearia o utilizador em frente a um
 *    spinner enquanto 30 threads viram embeddings — e, se a quota gratuita
 *    estourasse a meio, a sincronização (que funcionou) parecia ter falhado.
 *  - Uma fila a sério precisa de um worker a correr fora do Next, que este
 *    projeto não tem e que seria infraestrutura a fingir num portfólio.
 *
 * Fica **indexação incremental sob pedido, idempotente**: `indexPendingEmails`
 * pega apenas nos emails ainda sem embedding, em lotes com teto, e é chamada
 * (a) logo a seguir ao sync do Gmail, sem bloquear a resposta, e (b) antes de
 * uma pesquisa semântica, para que a primeira pesquisa numa caixa nova
 * funcione em vez de devolver vazio. Correr duas vezes não duplica nada.
 */
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailEmbeddings, emails, threads } from "@/lib/db/schema";
import { buildEmailChunks } from "./chunking";
import { EMBEDDING_MODEL, embedTexts } from "./embeddings";

/** Teto por execução: protege a quota diária do plano gratuito (§51). */
const DEFAULT_EMAIL_BUDGET = 40;

export interface IndexResult {
  indexedEmails: number;
  indexedChunks: number;
  remaining: number;
}

/** Quantos emails deste utilizador ainda não têm embedding. */
export async function countPendingEmails(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emails)
    .innerJoin(threads, eq(threads.id, emails.threadId))
    .leftJoin(emailEmbeddings, eq(emailEmbeddings.emailId, emails.id))
    .where(and(eq(threads.userId, userId), isNull(emailEmbeddings.id)));
  return row?.count ?? 0;
}

/**
 * Indexa os emails ainda por indexar deste utilizador.
 *
 * Tudo filtrado por `userId` desde a query inicial: um índice vetorial não
 * tem noção de dono, por isso o dono tem de ser garantido aqui e outra vez na
 * pesquisa (§29).
 */
export async function indexPendingEmails(
  userId: string,
  budget = DEFAULT_EMAIL_BUDGET,
): Promise<IndexResult> {
  const pending = await db
    .select({
      id: emails.id,
      threadId: emails.threadId,
      subject: threads.subject,
      fromName: emails.fromName,
      fromEmail: emails.fromEmail,
      bodyText: emails.bodyText,
    })
    .from(emails)
    .innerJoin(threads, eq(threads.id, emails.threadId))
    .leftJoin(emailEmbeddings, eq(emailEmbeddings.emailId, emails.id))
    .where(and(eq(threads.userId, userId), isNull(emailEmbeddings.id)))
    .limit(budget);

  if (pending.length === 0) {
    return { indexedEmails: 0, indexedChunks: 0, remaining: 0 };
  }

  // Um único lote de embeddings para todos os chunks de todos os emails —
  // ver a nota de custo em `embedTexts`.
  const rows: { emailId: string; threadId: string; chunkIndex: number; content: string }[] = [];
  for (const email of pending) {
    const chunks = buildEmailChunks(email);
    chunks.forEach((content, chunkIndex) => {
      rows.push({ emailId: email.id, threadId: email.threadId, chunkIndex, content });
    });
  }

  if (rows.length === 0) {
    // Emails sem corpo aproveitável (só assinatura, só citação). Não há nada
    // a indexar, mas também não se pode ficar a tentar sempre os mesmos: o
    // assunto sozinho serve de conteúdo mínimo.
    for (const email of pending) {
      rows.push({
        emailId: email.id,
        threadId: email.threadId,
        chunkIndex: 0,
        content: `Assunto: ${email.subject}\nDe: ${email.fromName ?? email.fromEmail}`,
      });
    }
  }

  const vectors = await embedTexts(
    rows.map((row) => row.content),
    "RETRIEVAL_DOCUMENT",
  );

  await db
    .insert(emailEmbeddings)
    .values(
      rows.map((row, index) => ({
        emailId: row.emailId,
        userId,
        threadId: row.threadId,
        chunkIndex: row.chunkIndex,
        content: row.content,
        embedding: vectors[index],
        model: EMBEDDING_MODEL,
      })),
    )
    .onConflictDoNothing();

  return {
    indexedEmails: pending.length,
    indexedChunks: rows.length,
    remaining: await countPendingEmails(userId),
  };
}
