import { defineConfig } from "vitest/config";

/**
 * Testes unitários (spec §49) — só lógica pura de `lib/ai` (schemas Zod,
 * construção de prompts). Sem DB, sem rede: os testes de integração das
 * Server Actions/rotas correm à parte via Playwright (`tests/e2e`).
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
