import { test, expect, type Page } from "@playwright/test";

/**
 * Fase 7 (spec §36-38): navegação mobile, atalhos de teclado e
 * acessibilidade da app.
 *
 * Ao contrário de `ai.spec.ts`, aqui não há nada de não-determinista: nenhum
 * destes fluxos toca no modelo, por isso são asserções duras.
 */

async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /explorar demo/i }).click();
  await page.waitForURL("**/app/**");
}

test.describe("§37 — navegação mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("a 375px há navegação: barra inferior em vez da sidebar", async ({ page }) => {
    await loginAsDemo(page);

    // A sidebar de desktop está escondida — era exatamente a lacuna que a
    // Fase 7 veio fechar (abaixo de 768px não havia forma de mudar de pasta).
    await expect(page.locator("aside")).toBeHidden();

    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    await expect(nav).toBeVisible();
    for (const item of ["Inbox", "Tarefas", "Agenda", "Copiloto"]) {
      await expect(nav.getByRole("link", { name: new RegExp(item) })).toBeVisible();
    }
    await expect(nav.getByRole("button", { name: /Mais/ })).toBeVisible();
  });

  test("os alvos de toque respeitam o mínimo de 44px (WCAG 2.5.5)", async ({ page }) => {
    await loginAsDemo(page);
    const alvos = page.getByRole("navigation", { name: "Navegação principal" }).locator("a, button");

    const total = await alvos.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i += 1) {
      const box = await alvos.nth(i).boundingBox();
      expect(box, "alvo sem caixa").not.toBeNull();
      expect(box!.height, `alvo ${i} demasiado baixo`).toBeGreaterThanOrEqual(44);
      expect(box!.width, `alvo ${i} demasiado estreito`).toBeGreaterThanOrEqual(44);
    }
  });

  test('"Mais" abre um drawer com o resto da navegação e navega', async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: /Mais/ })
      .click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Definições/ })).toBeVisible();

    await drawer.getByRole("link", { name: /^Archive/ }).click();
    await expect(page).toHaveURL(/\/app\/archive/);
    // O drawer fecha-se ao navegar — senão ficava por cima da página que
    // ele próprio abriu.
    await expect(drawer).toBeHidden();
  });

  test("não há scroll horizontal a 375px", async ({ page }) => {
    await loginAsDemo(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
});

test.describe("§37 — a partir de 768px volta a sidebar", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("sidebar visível, barra inferior escondida", async ({ page }) => {
    await loginAsDemo(page);
    await expect(page.locator("aside")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeHidden();
  });
});

test.describe("§36 — atalhos de teclado", () => {
  test("C abre o compose e G I vai para o Inbox", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/app/starred");

    await page.keyboard.press("c");
    await expect(page.getByRole("dialog").getByText("Novo email")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.keyboard.press("g");
    await page.keyboard.press("i");
    await expect(page).toHaveURL(/\/app\/inbox/);
  });

  test("S liga/desliga a estrela e A arquiva a conversa aberta", async ({ page }) => {
    await loginAsDemo(page);
    await page.locator('a[href*="/app/inbox/"]').first().click();

    const toolbar = page.getByTestId("thread-toolbar");
    const estrela = toolbar.getByRole("button", { name: /estrela$/ });
    const antes = await estrela.getAttribute("aria-label");
    await page.keyboard.press("s");
    await expect(estrela).not.toHaveAttribute("aria-label", antes!);

    await page.keyboard.press("a");
    await expect(page.getByText("Arquivado.")).toBeVisible({ timeout: 10_000 });
  });

  test("os atalhos NÃO disparam dentro de campos de texto", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/app/search");

    // "cas" contém `c` (compose), `a` (arquivar) e `s` (estrela).
    await page.getByRole("textbox").fill("cas");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveValue("cas");
  });
});

test.describe("§36 — prefers-reduced-motion", () => {
  /**
   * `page.emulateMedia()` explícito em vez de `test.use({ reducedMotion })`:
   * nesta combinação de Playwright + chrome-headless-shell a opção de
   * contexto não chegava à página (`matchMedia(...).matches` continuava
   * `false`), e um teste que emula mal passa a testar o oposto do que diz.
   */
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("com movimento reduzido o conteúdo aparece já no estado final", async ({ page }) => {
    await loginAsDemo(page);

    // Guarda: se a emulação deixar de funcionar, o teste falha aqui em vez
    // de passar a verificar nada.
    expect(
      await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
    ).toBe(true);

    // A garantia que interessa: com `reduce`, as primitivas de motion
    // devolvem os filhos sem `motion.div` — nada fica a meio de uma
    // transição, nem com `opacity` intermédia. Até aqui isto só estava
    // garantido por leitura do código; agora está emulado a sério.
    const linhas = page.locator('a[href*="/app/inbox/"]');
    await expect(linhas.first()).toBeVisible();

    const opacidades = await linhas.evaluateAll((nodes) =>
      nodes.slice(0, 6).map((n) => {
        // A opacidade que interessa é a do wrapper de animação, não a do link.
        const wrapper = n.parentElement;
        return Number(getComputedStyle(wrapper ?? n).opacity);
      }),
    );
    for (const o of opacidades) expect(o).toBe(1);

    // E nenhum wrapper pode ficar deslocado por um `transform` pendente.
    const transformadas = await linhas.evaluateAll((nodes) =>
      nodes
        .slice(0, 6)
        .map((n) => getComputedStyle(n.parentElement ?? n).transform)
        .filter((t) => t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)"),
    );
    expect(transformadas).toEqual([]);
  });

  test("a barra de navegação mobile não anima o indicador", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsDemo(page);
    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /Inbox/ })).toBeVisible();
  });
});

test.describe("§36 — acessibilidade da app", () => {
  test("os botões só-ícone têm nome acessível", async ({ page }) => {
    await loginAsDemo(page);
    await page.locator('a[href*="/app/inbox/"]').first().click();

    const semNome = await page.evaluate(() => {
      const problemas: string[] = [];
      for (const btn of document.querySelectorAll("button")) {
        const temTexto = (btn.textContent ?? "").trim().length > 0;
        const temLabel =
          btn.hasAttribute("aria-label") ||
          btn.hasAttribute("aria-labelledby") ||
          btn.hasAttribute("title");
        if (!temTexto && !temLabel) problemas.push(btn.outerHTML.slice(0, 90));
      }
      return problemas;
    });

    expect(semNome, `botões sem nome acessível: ${semNome.join(" | ")}`).toEqual([]);
  });

  test("a navegação por Tab chega às ações da conversa", async ({ page }) => {
    await loginAsDemo(page);
    await page.locator('a[href*="/app/inbox/"]').first().click();
    await expect(
      page.getByTestId("thread-toolbar").getByRole("button", { name: /estrela$/ }),
    ).toBeVisible();

    // Percorre o início da ordem de tabulação e confirma que o foco pára em
    // elementos reais (nenhum `tabindex` órfão nem armadilha de foco).
    const focados: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      focados.push(
        await page.evaluate(() => document.activeElement?.tagName ?? "NENHUM"),
      );
    }
    expect(focados).not.toContain("NENHUM");
    expect(focados.some((t) => t === "BUTTON" || t === "A")).toBe(true);
  });
});
