import { test, expect, type Page } from "@playwright/test";

import { DEMO_THREADS } from "../../src/lib/db/seed-data";

/**
 * Fluxo crítico da Fase 2 (spec §49): login → inbox → thread → ações →
 * compose/send → labels → search. Corre contra o dataset de `pnpm db:seed`
 * (o script `test:e2e` reseeda automaticamente via `pretest:e2e`) — se um
 * assunto mudar em `seed-data.ts`, estes testes usam-no diretamente em vez
 * de strings soltas, para não desincronizar.
 *
 * Nota sobre os locators: no layout de duas colunas, o assunto de uma
 * thread pode aparecer ao mesmo tempo na lista (row) e no cabeçalho do
 * detail (<h1>) — por isso as verificações de "aparece na lista X" usam
 * sempre `listRow()`, nunca `getByText` solto.
 */

function listRow(page: Page, folder: string, subject: string) {
  return page.locator(`a[href*="/app/${folder}/"]`).filter({ hasText: subject });
}

const welcomeSubject = DEMO_THREADS.find((t) => t.subject.startsWith("Bem-vindo"))!.subject;
const starredSubject = DEMO_THREADS.find((t) => t.folder === "inbox" && t.isStarred)!.subject;
const archivableSubject = "A tua encomenda foi enviada";
const trashableSubject = "Newsletter semanal: Product & Design Weekly";
const invoiceSubject = DEMO_THREADS.find((t) => t.subject.startsWith("Fatura"))!.subject;

async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /explorar demo/i }).click();
  await page.waitForURL("**/app/**");
}

test.describe("Fase 2 — Email", () => {
  test("login com Demo Mode entra na inbox", async ({ page }) => {
    await loginAsDemo(page);
    await expect(page).toHaveURL(/\/app\/inbox/);
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await expect(listRow(page, "inbox", welcomeSubject)).toBeVisible();
  });

  test("abrir uma thread mostra o conteúdo e marca como lida", async ({ page }) => {
    await loginAsDemo(page);
    await listRow(page, "inbox", welcomeSubject).click();
    await expect(page.getByRole("heading", { name: welcomeSubject })).toBeVisible();
    await expect(page.getByText(/AI Insights/)).toBeVisible();
  });

  test("estrela: marcar e ver em Starred", async ({ page }) => {
    await loginAsDemo(page);
    const row = listRow(page, "inbox", welcomeSubject);
    await row.hover();
    await row.getByLabel("Adicionar estrela").click();

    await page.getByRole("link", { name: "Starred" }).click();
    await expect(listRow(page, "starred", welcomeSubject)).toBeVisible();

    // limpa o estado para não afetar outras execuções
    const starredRow = listRow(page, "starred", welcomeSubject);
    await starredRow.hover();
    await starredRow.getByLabel("Remover estrela").click();
  });

  test("starred mostra a thread marcada com estrela no seed", async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole("link", { name: "Starred" }).click();
    await expect(listRow(page, "starred", starredSubject)).toBeVisible();
  });

  test("arquivar e restaurar uma thread", async ({ page }) => {
    await loginAsDemo(page);
    await listRow(page, "inbox", archivableSubject).click();
    await page.getByLabel("Arquivar").click();

    await page.getByRole("link", { name: "Archive" }).click();
    await expect(listRow(page, "archive", archivableSubject)).toBeVisible();

    await listRow(page, "archive", archivableSubject).click();
    await page.getByLabel("Mover para Inbox").click();
    await page.getByRole("link", { name: "Inbox" }).click();
    await expect(listRow(page, "inbox", archivableSubject)).toBeVisible();
  });

  test("mover para o lixo e apagar definitivamente", async ({ page }) => {
    await loginAsDemo(page);
    await listRow(page, "inbox", trashableSubject).click();
    await page.getByLabel("Mover para o lixo").click();
    // "Mover para o lixo" já navega de volta para a pasta de origem sozinho
    // (deixa de fazer sentido ver a thread aqui) — espera por isso antes de
    // navegar para Trash, para não colidir com esse redirect.
    await page.waitForURL("**/app/inbox");

    await page.getByRole("link", { name: "Trash" }).click();
    await expect(listRow(page, "trash", trashableSubject)).toBeVisible();

    await listRow(page, "trash", trashableSubject).click();
    await page.getByLabel("Apagar definitivamente").click();
    await expect(listRow(page, "trash", trashableSubject)).toHaveCount(0);
  });

  test("compose: escrever, autosave como draft e enviar", async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole("button", { name: "Novo email" }).click();
    await page.getByPlaceholder("nome@exemplo.com, outro@exemplo.com").fill("destino@exemplo.com");
    await page.getByRole("dialog").locator("input").nth(1).fill("Assunto E2E");
    await page.getByPlaceholder("Escreve a tua mensagem...").fill("Corpo de teste E2E.");

    // autosave (debounced) deve criar o rascunho antes do envio
    await expect(page.getByText(/Rascunho guardado|A guardar rascunho/)).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("link", { name: "Sent" }).click();
    await expect(listRow(page, "sent", "Assunto E2E")).toBeVisible();
  });

  test("responder a uma thread acrescenta mensagem", async ({ page }) => {
    await loginAsDemo(page);
    await listRow(page, "inbox", invoiceSubject).click();
    await page.getByRole("button", { name: "Responder" }).click();
    await page.getByPlaceholder("Escreve a tua resposta...").fill("Obrigado, recebido!");
    await page.getByRole("button", { name: "Enviar" }).click();
    // "Obrigado, recebido!" também passa a ser o snippet da thread na lista
    // — por isso confirma-se dentro da mensagem em si, não com getByText solto.
    await expect(
      page.locator("div").filter({ hasText: /^Obrigado, recebido!$/ }),
    ).toBeVisible();
  });

  test("labels: criar, aplicar a uma thread e filtrar", async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole("link", { name: "Labels" }).click();
    await page.getByRole("button", { name: "Nova label" }).click();
    await page.getByPlaceholder("Nome da label").fill("Teste E2E");
    await page.getByRole("button", { name: "Criar" }).click();
    await expect(page.getByText("Teste E2E")).toBeVisible();

    await page.getByRole("link", { name: "Inbox" }).click();
    await listRow(page, "inbox", welcomeSubject).click();
    await page.locator('button:has(svg.lucide-tag)').first().click();
    await page.getByRole("menuitemcheckbox", { name: "Teste E2E" }).click();
    // O Radix fecha o dropdown automaticamente ao selecionar um item —
    // reconsultar o próprio checkbox depois do clique é frágil (o elemento
    // pode já ter desmontado a meio da animação de fecho). Confirma-se antes
    // pelo chip que aparece no cabeçalho da thread assim que o server action
    // + revalidação completarem (o estado vem de `thread.labels`, não é
    // otimista).
    await expect(page.getByTestId("thread-labels").getByText("Teste E2E", { exact: true })).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole("link", { name: "Labels" }).click();
    await page.getByRole("link", { name: "Teste E2E" }).click();
    await expect(listRow(page, "labels", welcomeSubject)).toBeVisible();

    // limpeza: apaga a label de teste
    await page.getByRole("link", { name: "Labels" }).click();
    const row = page.locator("div").filter({ hasText: "Teste E2E" }).last();
    await row.getByLabel("Apagar").click();
  });

  test("search encontra por assunto", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/app/search?q=fatura");
    await expect(page.getByText(invoiceSubject).first()).toBeVisible();
  });
});
