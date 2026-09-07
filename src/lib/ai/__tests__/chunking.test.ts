import { describe, expect, it } from "vitest";

import { buildEmailChunks, chunkText, cleanEmailText } from "../chunking";

describe("cleanEmailText", () => {
  it("corta a partir da assinatura", () => {
    const clean = cleanEmailText("Podes enviar o relatório?\n--\nJoão Silva\nDiretor\njoao@empresa.pt");
    expect(clean).toBe("Podes enviar o relatório?");
  });

  it("corta a partir do cabeçalho de mensagem reencaminhada", () => {
    const clean = cleanEmailText(
      "Vê isto abaixo.\n\nEm 3 de setembro, Ana escreveu:\nOlá, precisamos de falar sobre o contrato.",
    );
    expect(clean).toBe("Vê isto abaixo.");
  });

  it("remove linhas citadas e de cancelamento de subscrição", () => {
    const clean = cleanEmailText(
      "Concordo com a proposta.\n> proposta original\n> segunda linha citada\nPara cancelar subscrição clica aqui.",
    );
    expect(clean).toBe("Concordo com a proposta.");
  });

  it("normaliza espaços e linhas em branco a mais", () => {
    expect(cleanEmailText("Olá   mundo\n\n\n\nAdeus")).toBe("Olá mundo\n\nAdeus");
  });

  it("devolve string vazia quando o email é só assinatura", () => {
    expect(cleanEmailText("--\nJoão Silva\nDiretor")).toBe("");
  });
});

describe("chunkText", () => {
  it("não parte texto curto", () => {
    expect(chunkText("Uma frase curta.")).toEqual(["Uma frase curta."]);
  });

  it("devolve nada para texto vazio", () => {
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("parte texto longo em vários blocos com sobreposição", () => {
    const paragraph = `${"Frase de contexto sobre o projeto. ".repeat(40)}`;
    const chunks = chunkText(paragraph);
    expect(chunks.length).toBeGreaterThan(1);
    // A sobreposição existe para não cortar uma ideia na fronteira: o início
    // de um chunk tem de aparecer algures no anterior.
    expect(chunks[0].endsWith(chunks[1].slice(0, 30))).toBe(false);
    expect(chunks[0]).toContain(chunks[1].slice(0, 20));
  });

  it("prefere cortar em fim de frase e não a meio de uma palavra", () => {
    const text = `${"Isto é uma frase completa e razoavelmente longa. ".repeat(30)}`;
    for (const chunk of chunkText(text)) {
      expect(chunk.endsWith(".")).toBe(true);
    }
  });

  it("trava o número de chunks de um email muito longo (custo)", () => {
    const huge = "Palavra ".repeat(20000);
    expect(chunkText(huge).length).toBeLessThanOrEqual(8);
  });
});

describe("buildEmailChunks", () => {
  const email = {
    subject: "Atraso na entrega do protótipo",
    fromName: "Ana Costa",
    fromEmail: "ana@cliente.pt",
    bodyText: "Estamos preocupados com a data combinada. Conseguem confirmar até sexta?",
  };

  it("prefixa cada chunk com assunto e remetente", () => {
    const chunks = buildEmailChunks(email);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain("Assunto: Atraso na entrega do protótipo");
    expect(chunks[0]).toContain("De: Ana Costa <ana@cliente.pt>");
    expect(chunks[0]).toContain("Conseguem confirmar até sexta?");
  });

  it("usa o endereço quando não há nome", () => {
    const chunks = buildEmailChunks({ ...email, fromName: null });
    expect(chunks[0]).toContain("De: ana@cliente.pt <ana@cliente.pt>");
  });

  it("não gera chunks quando o corpo é só assinatura", () => {
    expect(buildEmailChunks({ ...email, bodyText: "--\nAna Costa" })).toEqual([]);
  });

  it("repete o cabeçalho em todos os chunks de um email longo", () => {
    const chunks = buildEmailChunks({
      ...email,
      bodyText: "Detalhe importante sobre o prazo do projeto. ".repeat(60),
    });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.startsWith("Assunto: Atraso na entrega do protótipo")).toBe(true);
    }
  });
});
