/**
 * Model routing (spec §51–52) — "classificação simples → modelo pequeno,
 * resumo → modelo médio, raciocínio complexo → modelo avançado". A Fase 4
 * não tem raciocínio complexo (isso é o AI Agent da Fase 5); por isso só
 * usamos dois níveis por agora.
 *
 * Duas tabelas (Anthropic e Google) porque cada provider tem os seus
 * próprios IDs de modelo — `resolveModel(provider, tier)` escolhe a certa.
 * Ver docs/status.md "Decisão de provider de IA" para o porquê de haver
 * dois providers implementados (Anthropic sem crédito, Google/Gemini como
 * provider ativo por agora — tier gratuito, objetivo de custo zero).
 */
import type { AIProviderName } from "./provider";

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

/**
 * Modelos Google/Gemini — versões FIXAS (`gemini-3.5-flash` /
 * `gemini-3.5-flash-lite`), não os aliases "-latest". Confirmado
 * empiricamente contra a API real em 2026-09-05 (ver docs/status.md
 * "Rate limits do tier gratuito — Gemini"): `gemini-flash-latest` aponta
 * agora para `gemini-3.8-flash`, cuja quota gratuita é de só 20 pedidos/DIA
 * por projeto — inviável para uma app testada repetidamente. Um alias
 * "-latest" pode mudar de geração sem qualquer alteração de código nossa e
 * arrastar a app para uma quota assim outra vez; por isso, ao contrário do
 * que a Anthropic recomenda (onde fixamos a versão por estabilidade de
 * comportamento), aqui fixamos por estabilidade de QUOTA — `gemini-3.5-*`
 * teve quota gratuita alta o suficiente para não ser atingida nesta sessão
 * apesar de dezenas de pedidos de teste.
 *
 * Só modelos da família "flash" (nunca "pro") — os modelos "pro" não têm
 * tier gratuito garantido (confirmado que `gemini-3.1-pro-preview` não
 * tem), e o objetivo explícito desta escolha de provider é custo zero.
 * "flash" normal (mais capaz) faz de "modelo médio" para resumo/composição/
 * chat; "flash-lite" (mais rápido/barato) faz de "modelo pequeno" para
 * classificação.
 */
const GOOGLE_MODELS: Record<AITaskTier, string> = {
  classify: "gemini-3.5-flash-lite",
  summarize: "gemini-3.5-flash",
  compose: "gemini-3.5-flash",
  chat: "gemini-3.5-flash",
};

export function resolveModel(provider: AIProviderName, tier: AITaskTier): string {
  return provider === "google" ? GOOGLE_MODELS[tier] : ANTHROPIC_MODELS[tier];
}
