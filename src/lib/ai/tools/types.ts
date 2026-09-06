/**
 * Contrato das ferramentas do agente (Fase 5, spec §17-18).
 *
 * Regras que este tipo existe para tornar obrigatórias:
 * - Toda ferramenta declara um schema Zod: os argumentos do LLM nunca são
 *   usados sem validação (spec §58/§59).
 * - Toda ferramenta que escreve declara uma política de confirmação, e
 *   qualquer confirmação tem de conseguir dizer ao utilizador QUANTOS itens
 *   são afetados antes de executar (spec §18).
 * - `execute` recebe o `userId` do servidor (sessão), nunca um id vindo do
 *   LLM ou do cliente (spec §29/§30).
 */
import type { ZodType } from "zod";

/** JSON Schema dos argumentos de uma ferramenta (gerado do Zod). */
export type AIToolParameters = Record<string, unknown>;

export interface ToolContext {
  /** Vem sempre da sessão do servidor. O LLM não tem como influenciá-lo. */
  userId: string;
  userEmail: string;
  userName: string | null;
}

export interface ToolPreview {
  /** Descrição em PT-PT do que vai acontecer, mostrada na confirmação. */
  summary: string;
  /** Número de itens afetados — obrigatório mostrar antes (spec §18). */
  affectedCount: number;
}

/**
 * Propostas que a UI mostra como cards com botão — nunca são gravadas pela
 * ferramenta que as produz (spec §20/§21: só com clique do utilizador).
 */
export type AgentUiPayload =
  | {
      type: "taskProposals";
      items: { title: string; dueDate: string | null; sourceThreadId: string | null }[];
    }
  | {
      type: "meetingProposals";
      items: {
        title: string;
        startsAt: string;
        endsAt: string | null;
        location: string | null;
        sourceThreadId: string | null;
      }[];
    };

export interface ToolResult {
  /** Texto devolvido ao modelo como resultado da ferramenta. */
  output: string;
  /** Dados estruturados para a UI (cards de proposta), se aplicável. */
  ui?: AgentUiPayload;
}

/**
 * Política de confirmação (spec §18):
 * - `never`: seguro e reversível, executa direto.
 * - `bulk`: confirma quando afeta mais do que um item ("mover em massa").
 * - `always`: destrutivo ou irreversível (enviar, apagar) — confirma sempre.
 */
export type ConfirmationPolicy = "never" | "bulk" | "always";

export interface AgentTool<TArgs> {
  name: string;
  description: string;
  schema: ZodType<TArgs>;
  kind: "read" | "write";
  confirmation: ConfirmationPolicy;
  /** Obrigatório em tudo o que possa pedir confirmação (`bulk`/`always`). */
  preview?: (ctx: ToolContext, args: TArgs) => Promise<ToolPreview>;
  execute: (ctx: ToolContext, args: TArgs) => Promise<ToolResult>;
}

/** Ferramenta com os argumentos apagados, para poder guardar todas na mesma lista. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- variância: o registo guarda ferramentas com argumentos diferentes; a validação real acontece sempre via `tool.schema.safeParse` antes de `execute`.
export type AnyAgentTool = AgentTool<any>;

/**
 * Erro esperado de uma ferramenta (thread não encontrada, label inexistente,
 * ...). É devolvido ao modelo como resultado para ele poder corrigir-se,
 * em vez de rebentar o ciclo do agente.
 */
export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}
