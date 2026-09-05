/**
 * Model routing (spec §51–52) — "classificação simples → modelo pequeno,
 * resumo → modelo médio, raciocínio complexo → modelo avançado". A Fase 4
 * não tem raciocínio complexo (isso é o AI Agent da Fase 5); por isso só
 * usamos dois níveis por agora.
 *
 * Só o provider Anthropic está implementado nesta fase (decisão do
 * utilizador, ver docs/status.md) — os IDs abaixo são só para esse provider.
 * Quando outro provider for ligado, adiciona-se uma tabela equivalente e
 * `resolveModel()` passa a escolher por `provider`.
 */

export type AITaskTier = "classify" | "summarize" | "compose" | "chat";

const ANTHROPIC_MODELS: Record<AITaskTier, string> = {
  // Categorização/prioridade: schema pequeno, chamado com frequência
  // (potencialmente a cada thread aberta) — modelo mais barato compensa.
  classify: "claude-haiku-4-5",
  // Resumo, geração de resposta e AI chat: precisam de melhor compreensão de
  // contexto/tom; ainda não é "raciocínio complexo" (isso fica para o AI
  // Agent da Fase 5, que poderá subir para um modelo mais avançado).
  summarize: "claude-sonnet-5",
  compose: "claude-sonnet-5",
  chat: "claude-sonnet-5",
};

export function resolveModel(tier: AITaskTier): string {
  return ANTHROPIC_MODELS[tier];
}
