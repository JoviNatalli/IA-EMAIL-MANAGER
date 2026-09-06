/**
 * Unit — invariantes do registo de ferramentas do agente (spec §17-18, §59).
 *
 * Estes testes não chamam o modelo nem a base de dados: verificam as regras
 * que têm de ser verdade só de olhar para o registo, e que uma alteração
 * futura pode partir sem ninguém dar por isso (ex.: acrescentar uma
 * ferramenta destrutiva e esquecer a confirmação).
 */
import { describe, expect, it, vi } from "vitest";

// As ferramentas de escrita chamam as Server Actions da app, que por sua vez
// arrastam o `next-auth` (não resolve fora do runtime do Next). Aqui só se
// testa o registo — nenhuma ferramenta é executada —, por isso o módulo é
// substituído por stubs.
vi.mock("@/app/actions/emails", () => ({
  moveThread: vi.fn(),
  saveDraft: vi.fn(),
  sendDraft: vi.fn(),
  sendReply: vi.fn(),
  setThreadLabel: vi.fn(),
  setThreadRead: vi.fn(),
  toggleThreadStar: vi.fn(),
}));

import { findAgentTool, getAgentTools, getToolDefinitions } from "../tools";

/** Ferramentas exigidas explicitamente pelo master-spec §17. */
const SPEC_TOOLS = [
  "searchEmails",
  "getEmail",
  "getThread",
  "summarizeThread",
  "createDraft",
  "sendEmail",
  "archiveEmail",
  "markAsRead",
  "starEmail",
  "addLabel",
  "removeLabel",
  "createTask",
  "createReminder",
  "findEmailsByDate",
  "findEmailsBySender",
];

describe("registo de ferramentas", () => {
  it("inclui todas as ferramentas do §17", () => {
    const names = getAgentTools().map((t) => t.name);
    for (const expected of SPEC_TOOLS) expect(names).toContain(expected);
  });

  it("não tem nomes repetidos", () => {
    const names = getAgentTools().map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("expõe cada ferramenta ao modelo como JSON Schema de objeto", () => {
    for (const definition of getToolDefinitions()) {
      expect(definition.description.length).toBeGreaterThan(10);
      expect(definition.parameters).toMatchObject({ type: "object" });
    }
  });
});

describe("políticas de confirmação (spec §18)", () => {
  it("enviar email e responder exigem sempre confirmação", () => {
    for (const name of ["sendEmail", "replyToThread"]) {
      expect(findAgentTool(name)?.confirmation).toBe("always");
    }
  });

  it("ações em massa sobre emails confirmam quando afetam mais do que um item", () => {
    for (const name of ["archiveEmail", "markAsRead", "starEmail", "addLabel", "removeLabel"]) {
      expect(findAgentTool(name)?.confirmation).toBe("bulk");
    }
  });

  it("nenhuma ferramenta de leitura pede confirmação", () => {
    for (const tool of getAgentTools().filter((t) => t.kind === "read")) {
      expect(tool.confirmation).toBe("never");
    }
  });

  it("toda ferramenta que pede confirmação sabe pré-visualizar o efeito (contagem obrigatória no §18)", () => {
    for (const tool of getAgentTools().filter((t) => t.confirmation !== "never")) {
      expect(typeof tool.preview).toBe("function");
    }
  });

  it("extractTasks e detectMeetings são leitura pura — nunca criam nada sozinhas (spec §20/§21)", () => {
    for (const name of ["extractTasks", "detectMeetings"]) {
      expect(findAgentTool(name)?.kind).toBe("read");
    }
  });
});

describe("validação dos argumentos do LLM (spec §58/§59)", () => {
  it("rejeita ids que não são uuid", () => {
    const tool = findAgentTool("getThread");
    expect(tool?.schema.safeParse({ threadId: "não-é-um-uuid" }).success).toBe(false);
  });

  it("rejeita uma ação em massa sem alvos", () => {
    const tool = findAgentTool("archiveEmail");
    expect(tool?.schema.safeParse({ threadIds: [] }).success).toBe(false);
  });

  it("limita o número de conversas afetadas de uma vez", () => {
    const tool = findAgentTool("archiveEmail");
    const tooMany = Array.from({ length: 100 }, () => "11111111-1111-4111-8111-111111111111");
    expect(tool?.schema.safeParse({ threadIds: tooMany }).success).toBe(false);
  });

  it("rejeita destinatários com email inválido no envio", () => {
    const tool = findAgentTool("sendEmail");
    const result = tool?.schema.safeParse({
      to: [{ email: "isto-não-é-email" }],
      subject: "Olá",
      body: "Corpo",
    });
    expect(result?.success).toBe(false);
  });

  it("rejeita datas que não são datas", () => {
    expect(findAgentTool("createReminder")?.schema.safeParse({ title: "x", remindAt: "sexta-feira" }).success).toBe(
      false,
    );
    expect(
      findAgentTool("createReminder")?.schema.safeParse({ title: "x", remindAt: "2026-09-12T14:00:00Z" }).success,
    ).toBe(true);
  });

  it("aceita argumentos válidos", () => {
    const result = findAgentTool("archiveEmail")?.schema.safeParse({
      threadIds: ["11111111-1111-4111-8111-111111111111"],
    });
    expect(result?.success).toBe(true);
  });
});
