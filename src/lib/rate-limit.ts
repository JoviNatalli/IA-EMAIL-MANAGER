/**
 * Rate limiting das rotas de IA (Fase 7, spec §30).
 *
 * Janela deslizante em memória, por utilizador. É deliberadamente simples, e
 * as limitações são reais — vale a pena serem ditas em vez de descobertas:
 *
 *  - **Não sobrevive a reinícios nem a várias instâncias.** Num deploy com
 *    mais do que um processo, cada um tem o seu contador. Para produção a
 *    sério isto é Redis (Upstash) ou o rate limiting da própria plataforma;
 *    aqui seria infraestrutura a fingir para uma demo de portefólio.
 *  - **Não protege contra um atacante sem sessão**: as rotas já exigem
 *    autenticação antes de chegar aqui, e é por utilizador, não por IP.
 *
 * O que resolve mesmo, e é o risco concreto deste projeto: um cliente com
 * sessão válida (ou um bug de UI num loop) a esgotar a quota diária gratuita
 * do Gemini em segundos — o que já aconteceu a testar a Fase 5.
 */
import { AIError } from "@/lib/ai/errors";

interface Window {
  /** Timestamps (ms) dos pedidos dentro da janela. */
  hits: number[];
}

const windows = new Map<string, Window>();

/** Evita que o mapa cresça sem fim com utilizadores que já não voltam. */
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitRule {
  /** Nome do limite — aparece na chave, para limites separados por rota. */
  name: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Segundos até poder tentar de novo (só quando `ok` é falso). */
  retryAfterSeconds: number;
}

/**
 * Limites por rota. O do agente é mais apertado porque um turno seu gasta
 * VÁRIAS chamadas ao modelo (LLM → ferramenta → LLM), não uma.
 */
export const AI_AGENT_LIMIT: RateLimitRule = { name: "ai-agent", limit: 12, windowMs: 60_000 };
export const AI_SEARCH_LIMIT: RateLimitRule = { name: "ai-search", limit: 20, windowMs: 60_000 };
/** Server Actions de IA (analisar, responder, compose, briefing). */
export const AI_ACTION_LIMIT: RateLimitRule = { name: "ai-action", limit: 25, windowMs: 60_000 };

export function checkRateLimit(rule: RateLimitRule, userId: string): RateLimitResult {
  const key = `${rule.name}:${userId}`;
  const now = Date.now();
  const cutoff = now - rule.windowMs;

  const existing = windows.get(key);
  const hits = (existing?.hits ?? []).filter((t) => t > cutoff);

  if (hits.length >= rule.limit) {
    const oldest = hits[0];
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000)),
    };
  }

  hits.push(now);
  windows.set(key, { hits });

  // Limpeza preguiçosa: só quando o mapa fica grande, e só do que já
  // expirou. Um `setInterval` manteria o processo acordado sem necessidade.
  if (windows.size > MAX_TRACKED_KEYS) {
    for (const [k, v] of windows) {
      if (v.hits.every((t) => t <= cutoff)) windows.delete(k);
    }
  }

  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * Versão para Server Actions: em vez de devolver um resultado, lança um
 * `AIError` — assim a UI mostra a mensagem PT-PT pelo mesmo caminho que já
 * trata qualquer outra falha de IA (spec §35), sem cada action precisar de
 * um ramo próprio para isto.
 */
export function guardAiRateLimit(rule: RateLimitRule, userId: string): void {
  const result = checkRateLimit(rule, userId);
  if (result.ok) return;
  throw new AIError(`Rate limit local excedido (${rule.name}, ${rule.limit}/${rule.windowMs}ms).`, {
    userMessage: `Demasiados pedidos de IA seguidos. Tente novamente daqui a ${result.retryAfterSeconds}s.`,
  });
}

/** Só para testes — o estado é global ao processo. */
export function resetRateLimits(): void {
  windows.clear();
}
