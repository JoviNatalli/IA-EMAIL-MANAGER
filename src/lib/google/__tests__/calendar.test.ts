import { beforeAll, describe, expect, it } from "vitest";

import { mapCalendarError } from "../calendar-client";
import { buildCalendarAuthUrl, calendarRedirectUri } from "../calendar-oauth";
import { CALENDAR_OAUTH_SCOPES, GMAIL_OAUTH_SCOPES } from "../scopes";

describe("scopes do Calendar", () => {
  it("são independentes dos do Gmail (autorização incremental, §21)", () => {
    const gmail = new Set<string>(GMAIL_OAUTH_SCOPES);
    for (const scope of CALENDAR_OAUTH_SCOPES) {
      expect(gmail.has(scope)).toBe(false);
    }
  });

  it("pedem o mínimo necessário — eventos, não gestão de calendários", () => {
    expect(CALENDAR_OAUTH_SCOPES).toEqual(["https://www.googleapis.com/auth/calendar.events"]);
  });
});

describe("buildCalendarAuthUrl", () => {
  beforeAll(() => {
    process.env.AUTH_GOOGLE_ID ??= "test-client-id";
    process.env.AUTH_GOOGLE_SECRET ??= "test-client-secret";
  });

  it("pede refresh_token e mantém os scopes já concedidos", () => {
    const url = new URL(buildCalendarAuthUrl("state-123"));
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("include_granted_scopes")).toBe("true");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toBe(CALENDAR_OAUTH_SCOPES.join(" "));
    expect(url.searchParams.get("redirect_uri")).toBe(calendarRedirectUri());
  });

  it("não pede scopes do Gmail", () => {
    const scope = new URL(buildCalendarAuthUrl("s")).searchParams.get("scope") ?? "";
    expect(scope).not.toContain("gmail");
  });
});

describe("mapCalendarError", () => {
  /** Spec §35: o que chega à UI nunca pode ser o texto cru da API. */
  const rawDetail = "Request had insufficient authentication scopes.";

  it("distingue scope insuficiente de erro temporário", () => {
    const insufficient = mapCalendarError(403, {
      error: { message: rawDetail, errors: [{ reason: "insufficientPermissions" }] },
    });
    expect(insufficient.needsReconnect).toBe(true);
    expect(insufficient.userMessage).toContain("Definições");

    const rateLimited = mapCalendarError(403, {
      error: { message: rawDetail, errors: [{ reason: "rateLimitExceeded" }] },
    });
    expect(rateLimited.needsReconnect).toBe(false);
  });

  it("marca 401 como precisando de reconexão", () => {
    expect(mapCalendarError(401, { error: { message: rawDetail } }).needsReconnect).toBe(true);
  });

  it("trata 5xx como indisponibilidade temporária", () => {
    const error = mapCalendarError(503, { error: { message: "backend error" } });
    expect(error.needsReconnect).toBe(false);
    expect(error.userMessage).toContain("indisponível");
  });

  it("nunca deixa o detalhe técnico chegar à mensagem do utilizador", () => {
    for (const status of [400, 401, 403, 404, 429, 500, 503]) {
      const error = mapCalendarError(status, { error: { message: rawDetail } });
      expect(error.userMessage).not.toContain(rawDetail);
      expect(error.userMessage).not.toContain(String(status));
      // ...mas a mensagem técnica continua disponível para os logs.
      expect(error.message).toContain(rawDetail);
    }
  });
});
