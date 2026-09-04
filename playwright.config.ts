import { defineConfig, devices } from "@playwright/test";

/**
 * Testes E2E (spec §49) — cobrem o fluxo crítico: login → inbox → abrir
 * thread → ações (star/archive/trash) → compose/send → labels → search.
 * Correm contra `pnpm dev`; a app tem de estar seedada (`pnpm db:seed`).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Só definido em ambientes com um binário Chromium pré-instalado
        // fora do cache normal do Playwright (ex. alguns sandboxes de CI).
        // Em qualquer máquina normal isto fica undefined e o Playwright
        // resolve o browser da forma habitual (`npx playwright install`).
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : undefined,
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
