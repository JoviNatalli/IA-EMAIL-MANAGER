/**
 * Registo de ferramentas do agente (spec §17).
 *
 * A lista do §17 é o mínimo; `extractTasks`/`detectMeetings`/`listTasks`
 * foram acrescentadas porque §20/§21 pedem deteção de tarefas e reuniões
 * "como ferramentas do agente". `replyToThread` também não está no §17, mas
 * responder a uma conversa existente é diferente de `sendEmail` (precisa do
 * threading correto) e é o pedido mais natural do utilizador.
 */
import { z } from "zod";

import { emailTools } from "./email-tools";
import { productivityTools } from "./productivity-tools";
import type { AnyAgentTool, AIToolParameters } from "./types";

const allTools: AnyAgentTool[] = [...emailTools, ...productivityTools];

const toolsByName = new Map(allTools.map((tool) => [tool.name, tool]));

export function getAgentTools(): AnyAgentTool[] {
  return allTools;
}

export function findAgentTool(name: string): AnyAgentTool | undefined {
  return toolsByName.get(name);
}

/** Definições no formato que a camada de provider envia ao modelo. */
export function getToolDefinitions(): { name: string; description: string; parameters: AIToolParameters }[] {
  return allTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: z.toJSONSchema(tool.schema) as AIToolParameters,
  }));
}

export { ToolError } from "./types";
export type { AgentTool, AgentUiPayload, AnyAgentTool, ToolContext, ToolResult } from "./types";
