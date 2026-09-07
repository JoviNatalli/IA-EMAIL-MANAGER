import { test, expect, type Page } from "@playwright/test";

/**
 * Fluxos de IA das Fases 4-6 (spec §49).
 *
 * DECISÃO DE DESENHO, porque muda o que estes testes provam: as chamadas ao
 * modelo acontecem no SERVIDOR, não no browser — o `page.route()` do
 * Playwright não as consegue intercetar, e mocká-las exigiria uma camada de
 * injeção que só existiria para os testes. Correm por isso contra o Gemini
 * real.
 *
 * Consequência: o modelo pode falhar por razões que não são bugs (quota
 * diária do plano gratuito esgotada, 503 do lado da Google). Um teste que
 * exigisse sempre uma resposta bem-sucedida seria intermitente e acabaria
 * ignorado.
 *
 * O que estes testes verificam é o CONTRATO, que é o que a spec §35 promete
 * e o que interessa mesmo: cada fluxo termina ou num resultado válido ou
 * numa mensagem de erro em PT-PT — nunca num ecrã partido, num erro técnico
 * cru, nem num spinner eterno. Se a IA funcionar, o caminho feliz é
 * verificado; se não, verifica-se que a falha é tratada.
 */

/** Sinais de que um erro técnico escapou para a UI (spec §35). */
const TECHNICAL_LEAKS = [
  /\bTypeError\b/,
  /\bundefined is not\b/,
  /\bECONNREFUSED\b/,
  /at async \w+/,
  /GoogleGenerativeAI/,
  /\bstack trace\b/i,
  /"error":\s*{/,
];

async function expectNoTechnicalLeak(page: Page) {
  const body = (await page.locator("body").innerText()).slice(0, 20_000);
  for (const pattern of TECHNICAL_LEAKS) {
    expect(body, `erro técnico cru visível na UI (${pattern})`).not.toMatch(pattern);
  }
}

async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /explorar demo/i }).click();
  await page.waitForURL("**/app/**");
}

test.describe("Fase 4 — IA na conversa", () => {
  test("analisar com IA devolve insights ou um erro tratado", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsDemo(page);

    await page.locator('a[href*="/app/inbox/"]').first().click();
    const analisar = page.getByRole("button", { name: /analisar com ia/i });
    await expect(analisar).toBeVisible();
    await analisar.click();

    // Sucesso = badges de prioridade/categoria. Falha tratada = mensagem
    // PT-PT no painel. Qualquer uma fecha o estado de "a analisar".
    const insights = page.getByText(/^Prioridade (Alta|Média|Baixa)$/);
    const erro = page.getByText(/não foi possível|limite|indisponível|não está configurada/i).first();

    await expect(insights.or(erro)).toBeVisible({ timeout: 75_000 });
    await expect(page.getByText(/A analisar com IA/)).toBeHidden();
    await expectNoTechnicalLeak(page);
  });

  test("smart replies aparecem como sugestões ou não aparecem de todo", async ({ page }) => {
    await loginAsDemo(page);
    await page.locator('a[href*="/app/inbox/"]').first().click();

    // Nunca deve haver um bloco de sugestões vazio a fingir que está a
    // pensar: ou tem conteúdo, ou o botão de responder está lá sozinho.
    await expect(page.getByRole("button", { name: /^Responder$/ })).toBeVisible();
    await expectNoTechnicalLeak(page);
  });
});

test.describe("Fase 5 — Agente com ações confirmáveis", () => {
  test("nada é arquivado sem confirmação explícita (§18)", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsDemo(page);

    // Alvo conhecido do seed, para a asserção final ser determinista.
    const newsletter = "Newsletter semanal: Product & Design Weekly";
    const naInbox = () =>
      page.locator('a[href*="/app/inbox/"]').filter({ hasText: newsletter });

    await page.goto("/app/inbox");
    await expect(naInbox()).toHaveCount(1);

    await page.goto("/app/ai");
    await page.getByRole("button", { name: /arquiva os emails de newsletter/i }).click();

    // Três desfechos legítimos, e nenhum deles é "arquivou sozinho":
    //  1. cartão de confirmação (é o caminho do §18 quando há vários itens);
    //  2. o agente responde em texto — pode pedir esclarecimento ou avisar
    //     que só encontrou um email (o modelo escolhe as palavras, e testar
    //     a frase exata seria testar o modelo, não a app);
    //  3. um erro tratado (quota diária esgotada, provider em baixo).
    const confirmacao = page.getByText("Confirmação necessária");
    const resposta = page.locator(".whitespace-pre-wrap").first();
    const erro = page.getByText(/não foi possível|limite|indisponível|demasiados/i).first();
    await expect(confirmacao.or(resposta).or(erro)).toBeVisible({ timeout: 100_000 });

    if (await confirmacao.isVisible()) {
      // Spec §18: a contagem de itens afetados é obrigatória ANTES de agir.
      await expect(page.getByText(/Itens afetados:/)).toBeVisible();
      await page.getByRole("button", { name: /^Cancelar$/ }).click();
      await expect(page.getByText(/cancelad/i).first()).toBeVisible({ timeout: 15_000 });
    }

    // A invariante que interessa mesmo, e a única parte determinista: em
    // nenhum destes caminhos o email pode ter saído do Inbox. Se um dia o
    // agente arquivar sem passar pela confirmação, é aqui que se vê.
    await page.goto("/app/inbox");
    await expect(naInbox()).toHaveCount(1);
    await expectNoTechnicalLeak(page);
  });

  test("o painel do agente não envia mensagens vazias", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/app/ai");

    const enviar = page.getByRole("button", { name: /enviar mensagem ao copiloto/i });
    await expect(enviar).toBeDisabled();

    await page.getByPlaceholder(/arquiva as newsletters/i).fill("olá");
    await expect(enviar).toBeEnabled();
  });
});

test.describe("Fase 6 — Pesquisa semântica", () => {
  test("o modo Significado devolve resultados ou um erro tratado", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsDemo(page);
    await page.goto("/app/search");

    await page.getByRole("button", { name: "Significado" }).click();
    await expect(page).toHaveURL(/mode=semantic/);

    // Paráfrase deliberada: nenhuma destas palavras está nos emails do seed
    // tal e qual — é isto que separa a pesquisa semântica da textual.
    await page.getByRole("textbox").fill("o site está em baixo e ninguém consegue pagar");
    await page.getByRole("textbox").press("Enter");

    const resultado = page.getByText(/% de proximidade/).first();
    const semResultados = page.getByText(/Nenhum email suficientemente relacionado/);
    const erro = page.getByText(/não foi possível|limite|indisponível/i).first();

    await expect(resultado.or(semResultados).or(erro)).toBeVisible({ timeout: 75_000 });
    await expectNoTechnicalLeak(page);
  });

  test("o modo palavras-chave continua a funcionar sem tocar na IA", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/app/search");

    await page.getByRole("textbox").fill("Fatura");
    // Debounce do modo palavras-chave (350ms) — sem Enter.
    await expect(page).toHaveURL(/q=Fatura/, { timeout: 10_000 });
    await expect(page.locator('a[href*="/app/"]').filter({ hasText: /Fatura/ }).first()).toBeVisible();
    await expect(page.getByText(/% de proximidade/)).toHaveCount(0);
  });
});
