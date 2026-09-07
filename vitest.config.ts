import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Testes unitários (spec §49) — lógica pura de `lib/ai`: schemas Zod,
 * construção de prompts e invariantes do registo de ferramentas do agente.
 * Sem rede e sem base de dados: os testes de integração das Server Actions
 * continuam a ser manuais (ver docs/status.md).
 *
 * `DATABASE_URL` é preenchida com um valor de faz-de-conta porque importar o
 * registo de ferramentas arrasta `lib/db` (que exige a variável para
 * arrancar). Nenhuma query chega a correr — o cliente Postgres só liga
 * quando alguém consulta de facto.
 */
process.env.DATABASE_URL ??= "postgresql://vitest@127.0.0.1:5432/vitest";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
