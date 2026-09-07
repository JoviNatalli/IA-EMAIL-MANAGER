/**
 * Limpeza e divisão do texto de email para indexação (spec §27:
 * "Email → limpar texto → chunk → embedding").
 *
 * Isto é lógica pura, sem rede nem base de dados — é o que a torna testável
 * e é onde a qualidade da pesquisa se ganha ou perde. Um índice construído
 * sobre assinaturas e citações devolve sempre os mesmos emails, porque o que
 * mais se repete numa caixa de correio é o rodapé.
 */

/** Linhas citadas (`>`), cabeçalhos de reencaminhamento e assinaturas. */
const QUOTE_PREFIX = /^\s*>+\s?/;
const FORWARD_HEADERS =
  /^\s*(-{2,}\s*(mensagem (reencaminhada|original)|forwarded message)|em .+ escreveu:|on .+ wrote:|de:|from:|enviada?:|sent:|para:|to:|assunto:|subject:)/i;
const SIGNATURE_DELIMITER = /^\s*(--\s*$|—\s*$|enviado do meu |sent from my )/i;
const UNSUBSCRIBE = /(cancelar subscri|unsubscribe|deixar de receber|gerir prefer[êe]ncias)/i;

/**
 * Tira do corpo tudo o que não é a mensagem em si.
 *
 * Nota: corta a partir do primeiro marcador de citação/assinatura em vez de
 * tentar limpar linha a linha — numa thread, tudo o que vem depois desse
 * marcador é conteúdo que já foi indexado no email anterior.
 */
export function cleanEmailText(raw: string): string {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    if (SIGNATURE_DELIMITER.test(line)) break;
    if (FORWARD_HEADERS.test(line)) break;
    if (QUOTE_PREFIX.test(line)) continue;
    if (UNSUBSCRIBE.test(line)) continue;
    kept.push(line.trim());
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Tamanho-alvo de cada chunk, em caracteres. */
const CHUNK_SIZE = 900;
/** Sobreposição entre chunks — evita cortar uma ideia a meio da fronteira. */
const CHUNK_OVERLAP = 150;
/** Abaixo disto não vale a pena um chunk próprio (nem um embedding). */
const MIN_CHUNK = 40;
/** Trava de custo: um email muito longo não gasta a quota toda sozinho. */
const MAX_CHUNKS_PER_EMAIL = 8;

/**
 * Divide o texto em blocos, preferindo cortar em fim de parágrafo e, quando
 * não dá, em fim de frase. Cortar a meio de uma frase produz um vetor que
 * não representa bem nem uma metade nem a outra.
 */
export function chunkText(text: string): string[] {
  const clean = text.trim();
  if (clean.length === 0) return [];
  if (clean.length <= CHUNK_SIZE) return [clean];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < clean.length && chunks.length < MAX_CHUNKS_PER_EMAIL) {
    const end = Math.min(cursor + CHUNK_SIZE, clean.length);
    let cut = end;

    if (end < clean.length) {
      const window = clean.slice(cursor, end);
      const paragraph = window.lastIndexOf("\n\n");
      const sentence = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("? "),
        window.lastIndexOf("! "),
      );
      // Só aceita a fronteira se ela não deixar um chunk ridiculamente curto.
      if (paragraph > CHUNK_SIZE * 0.5) cut = cursor + paragraph;
      else if (sentence > CHUNK_SIZE * 0.5) cut = cursor + sentence + 1;
    }

    const piece = clean.slice(cursor, cut).trim();
    if (piece.length >= MIN_CHUNK) chunks.push(piece);
    if (cut >= clean.length) break;
    cursor = Math.max(cut - CHUNK_OVERLAP, cursor + 1);
  }

  return chunks;
}

/**
 * Prepara os chunks de uma mensagem para indexação.
 *
 * O assunto e o remetente entram no início de cada chunk de propósito: numa
 * pesquisa por "aquele email do fornecedor de alojamento", o corpo pode nunca
 * dizer nem o nome nem o assunto, e sem este contexto o chunk fica órfão.
 */
export function buildEmailChunks(input: {
  subject: string;
  fromName: string | null;
  fromEmail: string;
  bodyText: string;
}): string[] {
  const body = cleanEmailText(input.bodyText);
  if (!body) return [];

  const header = `Assunto: ${input.subject}\nDe: ${input.fromName ?? input.fromEmail} <${input.fromEmail}>`;
  return chunkText(body).map((chunk) => `${header}\n\n${chunk}`);
}
