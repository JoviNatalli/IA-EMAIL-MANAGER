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

export type AITaskTier = "classify" | "summarize" | "compose" | "chat" | "agent";

const ANTHROPIC_MODELS: Record<AITaskTier, string> = {
  // Categorização/prioridade: schema pequeno, chamado com frequência
  // (potencialmente a cada thread aberta) — modelo mais barato compensa.
  classify: "claude-haiku-4-5",
  // Resumo, geração de resposta e AI chat: precisam de melhor compreensão de
  // contexto/tom, mas não são raciocínio complexo.
  summarize: "claude-sonnet-5",
  compose: "claude-sonnet-5",
  chat: "claude-sonnet-5",
  // Fase 5 — AI Agent com tool calling: é o "raciocínio complexo" do
  // §52 (decidir que ferramenta usar, encadear passos, interpretar
  // resultados), por isso sobe para o modelo avançado.
  agent: "claude-opus-5",
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
/**
 * Cada tier tem uma CADEIA de modelos, não um só: a quota gratuita do
 * Gemini é por modelo e por dia, e uma tarde de desenvolvimento da Fase 5
 * esgotou a do `gemini-3.5-flash` (ver docs/status.md). Quando isso
 * acontece, o provider passa automaticamente ao modelo seguinte da cadeia
 * em vez de a app ficar sem IA até ao dia seguinte. O primeiro da lista é
 * sempre o preferido.
 *
 * Só modelos da família "flash" (nunca "pro") — os "pro" não têm tier
 * gratuito garantido e o objetivo explícito é custo zero. Para o agente
 * (§52 pede "modelo avançado" para raciocínio complexo) assume-se a
 * limitação: um "flash" é mais frágil em raciocínio multi-passo.
 */
const GOOGLE_MODEL_CHAINS: Record<AITaskTier, string[]> = {
  classify: ["gemini-3.5-flash-lite", "gemini-3.6-flash"],
  summarize: ["gemini-3.5-flash", "gemini-3.6-flash"],
  compose: ["gemini-3.5-flash", "gemini-3.6-flash"],
  chat: ["gemini-3.5-flash", "gemini-3.6-flash"],
  agent: ["gemini-3.5-flash", "gemini-3.6-flash"],
};

/** Modelo preferido do tier (é este que fica registado nas análises guardadas). */
export function resolveModel(provider: AIProviderName, tier: AITaskTier): string {
  return resolveModelChain(provider, tier)[0];
}

/** Cadeia completa: o provider percorre-a quando um modelo esgota a quota diária. */
export function resolveModelChain(provider: AIProviderName, tier: AITaskTier): string[] {
  return provider === "google" ? GOOGLE_MODEL_CHAINS[tier] : [ANTHROPIC_MODELS[tier]];
}
