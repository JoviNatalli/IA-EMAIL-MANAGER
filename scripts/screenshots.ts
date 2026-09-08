/**
 * Captura os screenshots do README (Fase 8, spec §61/§62).
 *
 * Corre SEMPRE contra o Demo Mode e o dataset de seed — nunca contra uma
 * conta Gmail real, nem a do próprio autor: as imagens vão para um
 * repositório público e o conteúdo de emails reais não tem como voltar
 * atrás depois de commitado.
 *
 * Não é um teste: vive fora de `tests/e2e/` de propósito, para não correr
 * no `pnpm test:e2e`. Uso:
 *
 *   pnpm dev            # noutro terminal
 *   pnpm db:seed        # estado previsível
 *   pnpm screenshots
 */
import { chromium, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "docs", "screenshots");

/** Largura de portátil: o que um recrutador vê ao abrir o link. */
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

async function loginAsDemo(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole("button", { name: /explorar demo/i }).click();
  await page.waitForURL("**/app/**");
}

/** Espera por uma de várias condições, sem rebentar se a IA falhar. */
async function settle(page: Page, ms = 1200) {
  await page.waitForTimeout(ms);
}

/**
 * Esconde o botão flutuante de dev do Next.
 *
 * As imagens vão para o README de um portefólio: o indicador de
 * desenvolvimento não faz parte do produto e ainda tapava o item
 * "Settings" da sidebar. Escondido no browser em vez de desligado no
 * `next.config` — a config afeta o dia a dia de quem desenvolve, isto
 * afeta só a captura.
 */
async function hideDevChrome(page: Page) {
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }`,
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const shots: string[] = [];

  async function shoot(page: Page, name: string) {
    await hideDevChrome(page);
    const file = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file });
    shots.push(name);
    console.log(`  ✓ ${name}.png`);
  }

  // ── 1. Landing ────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto(BASE_URL);
    // A landing anima à entrada; sem isto apanha-se o meio da transição.
    await settle(page, 2000);
    await shoot(page, "01-landing");
    await ctx.close();
  }

  // ── 2. Inbox com AI Insights ──────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await loginAsDemo(page);
    await page.locator('a[href*="/app/inbox/"]').first().click();

    const analisar = page.getByRole("button", { name: /analisar com ia/i });
    if (await analisar.isVisible().catch(() => false)) {
      await analisar.click();
      // Ou aparecem os badges, ou uma mensagem de erro tratada — em
      // qualquer dos casos não vale a pena esperar mais.
      await page
        .getByText(/^Prioridade (Alta|Média|Baixa)$/)
        .waitFor({ timeout: 60_000 })
        .catch(() => console.warn("  ! insights não chegaram (quota?) — captura na mesma"));
    }
    await settle(page);
    await shoot(page, "02-inbox-ai-insights");
    await ctx.close();
  }

  // ── 3. Agente com cartão de confirmação ───────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await loginAsDemo(page);
    await page.goto(`${BASE_URL}/app/ai`);

    // Pedido escolhido por tocar em várias conversas: é o caminho que faz
    // o agente propor uma ação em massa e, aí, pedir confirmação (§18).
    await page.getByPlaceholder(/arquiva as newsletters/i).fill(
      "arquiva os emails do Northwind Cloud e da Cedar & Co",
    );
    await page.getByRole("button", { name: /enviar mensagem ao copiloto/i }).click();

    // O agente costuma perguntar em texto antes de propor a ação ("queres
    // que arquive estas duas?"). O cartão de confirmação (§18) só aparece
    // no turno seguinte, por isso confirma-se e espera-se por ele.
    const cartao = page.getByText("Confirmação necessária");
    await cartao.or(page.locator(".whitespace-pre-wrap").first()).waitFor({ timeout: 100_000 });

    if (!(await cartao.isVisible().catch(() => false))) {
      await page.getByPlaceholder(/arquiva as newsletters/i).fill("sim, arquiva as duas");
      await page.getByRole("button", { name: /enviar mensagem ao copiloto/i }).click();
      await cartao
        .waitFor({ timeout: 100_000 })
        .catch(() => console.warn("  ! sem cartão de confirmação — captura o que houver"));
    }
    await settle(page);
    await shoot(page, "03-agente-confirmacao");
    await ctx.close();
  }

  // ── 4. Pesquisa semântica ─────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await loginAsDemo(page);
    // Paráfrase: nenhuma destas palavras está nos emails tal e qual — é o
    // que separa a pesquisa por significado da textual.
    await page.goto(
      `${BASE_URL}/app/search?q=${encodeURIComponent("o site está em baixo e ninguém consegue pagar")}&mode=semantic`,
    );
    await page
      .getByText(/% de proximidade/)
      .first()
      .waitFor({ timeout: 60_000 })
      .catch(() => console.warn("  ! sem resultados semânticos (quota?)"));
    await settle(page);
    await shoot(page, "04-pesquisa-semantica");
    await ctx.close();
  }

  // ── 5. Calendário ─────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await loginAsDemo(page);
    await page.goto(`${BASE_URL}/app/calendar`);
    await settle(page);
    await shoot(page, "05-calendario");
    await ctx.close();
  }

  // ── 6. Navegação mobile com o drawer aberto ───────────────────────────
  {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await loginAsDemo(page);
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: /Mais/ })
      .click();
    await page.getByRole("dialog").waitFor();
    await settle(page, 800);
    await shoot(page, "06-mobile-drawer");
    await ctx.close();
  }

  await browser.close();
  console.log(`\n${shots.length} screenshots em docs/screenshots/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
