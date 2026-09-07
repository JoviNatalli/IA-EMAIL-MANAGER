import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AIError } from "@/lib/ai/errors";
import {
  checkRateLimit,
  guardAiRateLimit,
  resetRateLimits,
  type RateLimitRule,
} from "../rate-limit";

const RULE: RateLimitRule = { name: "teste", limit: 3, windowMs: 60_000 };

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("deixa passar até ao limite e trava a seguir", () => {
    for (let i = 0; i < RULE.limit; i += 1) {
      expect(checkRateLimit(RULE, "u1").ok).toBe(true);
    }
    expect(checkRateLimit(RULE, "u1").ok).toBe(false);
  });

  it("conta por utilizador — um não gasta a quota do outro (§29)", () => {
    for (let i = 0; i < RULE.limit; i += 1) checkRateLimit(RULE, "u1");
    expect(checkRateLimit(RULE, "u1").ok).toBe(false);
    expect(checkRateLimit(RULE, "u2").ok).toBe(true);
  });

  it("conta por regra — o limite do agente não gasta o da pesquisa", () => {
    const outra: RateLimitRule = { ...RULE, name: "outra" };
    for (let i = 0; i < RULE.limit; i += 1) checkRateLimit(RULE, "u1");
    expect(checkRateLimit(RULE, "u1").ok).toBe(false);
    expect(checkRateLimit(outra, "u1").ok).toBe(true);
  });

  it("liberta assim que a janela passa (é deslizante, não fixa)", () => {
    for (let i = 0; i < RULE.limit; i += 1) checkRateLimit(RULE, "u1");
    expect(checkRateLimit(RULE, "u1").ok).toBe(false);

    vi.advanceTimersByTime(RULE.windowMs + 1);
    expect(checkRateLimit(RULE, "u1").ok).toBe(true);
  });

  it("diz quanto falta esperar, e nunca 0 segundos", () => {
    for (let i = 0; i < RULE.limit; i += 1) checkRateLimit(RULE, "u1");
    const blocked = checkRateLimit(RULE, "u1");
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(RULE.windowMs / 1000);
  });
});

describe("guardAiRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("não faz nada enquanto houver quota", () => {
    expect(() => guardAiRateLimit(RULE, "u1")).not.toThrow();
  });

  it("lança AIError com mensagem PT-PT, nunca o detalhe técnico (§35)", () => {
    for (let i = 0; i < RULE.limit; i += 1) guardAiRateLimit(RULE, "u1");
    try {
      guardAiRateLimit(RULE, "u1");
      expect.unreachable("devia ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(AIError);
      const aiError = error as AIError;
      expect(aiError.userMessage).toContain("Demasiados pedidos");
      // O nome interno da regra e os números só vão para os logs.
      expect(aiError.userMessage).not.toContain("teste");
      expect(aiError.message).toContain("teste");
    }
  });
});
