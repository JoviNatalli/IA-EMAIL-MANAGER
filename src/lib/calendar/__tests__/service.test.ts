import { describe, expect, it } from "vitest";

import { buildEventPatch } from "../service";

describe("buildEventPatch", () => {
  it("inclui só os campos que a mudança do Google trouxe", () => {
    const patch = buildEventPatch({
      title: "Reunião de sync",
      startsAt: new Date("2026-09-10T14:00:00Z"),
      endsAt: new Date("2026-09-10T15:00:00Z"),
      location: "Sala 2",
    });
    expect(patch).toEqual({
      title: "Reunião de sync",
      startsAt: new Date("2026-09-10T14:00:00Z"),
      endsAt: new Date("2026-09-10T15:00:00Z"),
      location: "Sala 2",
    });
  });

  it("nunca apaga o título com null — a Google pode omitir `summary`", () => {
    const patch = buildEventPatch({ title: null, startsAt: null, endsAt: null, location: null });
    expect(patch.title).toBeUndefined();
  });

  it("não mexe em startsAt/endsAt quando a mudança não trouxe uma data válida", () => {
    const patch = buildEventPatch({ title: "Só mudou o local", startsAt: null, endsAt: null, location: "Novo local" });
    expect(patch.startsAt).toBeUndefined();
    expect(patch.endsAt).toBeUndefined();
    expect(patch.location).toBe("Novo local");
  });

  it("aceita location a passar a null (local removido do evento)", () => {
    const patch = buildEventPatch({
      title: null,
      startsAt: new Date("2026-09-10T14:00:00Z"),
      endsAt: null,
      location: null,
    });
    expect(patch.location).toBeNull();
  });
});
