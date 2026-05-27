import { describe, it, expect } from "vitest";
import { combineTimeline } from "./combineTimeline";
import type { Measurement, JournalEntry } from "./api";

const m = (measuredAt: string, extra?: Partial<Measurement>): Measurement => ({
  id: "m-" + measuredAt,
  batchId: "b1",
  measuredAt,
  brix: null,
  sg: null,
  temperatureC: null,
  note: null,
  createdAt: measuredAt,
  ...extra,
});

const j = (entryAt: string, extra?: Partial<JournalEntry>): JournalEntry => ({
  id: "j-" + entryAt,
  batchId: "b1",
  entryAt,
  body: "wpis " + entryAt,
  photoKey: null,
  photoUrl: null,
  createdAt: entryAt,
  ...extra,
});

describe("combineTimeline", () => {
  it("zwraca pustą tablicę dla pustych wejść", () => {
    expect(combineTimeline([], [])).toEqual([]);
  });

  it("zachowuje typ 'measurement' i 'journal'", () => {
    const out = combineTimeline(
      [m("2026-05-20T08:00:00.000Z")],
      [j("2026-05-21T08:00:00.000Z")],
    );
    expect(out.map((e) => e.kind)).toEqual(["measurement", "journal"]);
  });

  it("sortuje chronologicznie (asc) po dacie zdarzenia", () => {
    const out = combineTimeline(
      [m("2026-06-10T08:00:00.000Z"), m("2026-05-20T08:00:00.000Z")],
      [j("2026-05-25T08:00:00.000Z"), j("2026-06-05T08:00:00.000Z")],
    );
    expect(out.map((e) => e.at)).toEqual([
      "2026-05-20T08:00:00.000Z",
      "2026-05-25T08:00:00.000Z",
      "2026-06-05T08:00:00.000Z",
      "2026-06-10T08:00:00.000Z",
    ]);
  });

  it("przy identycznym timestamp stabilnie umieszcza pomiar przed wpisem", () => {
    const ts = "2026-05-25T12:00:00.000Z";
    const out = combineTimeline([m(ts)], [j(ts)]);
    expect(out.map((e) => e.kind)).toEqual(["measurement", "journal"]);
  });

  it("nie mutuje wejściowych tablic", () => {
    const ms = [m("2026-06-10T08:00:00.000Z"), m("2026-05-20T08:00:00.000Z")];
    const js = [j("2026-05-25T08:00:00.000Z")];
    const beforeMs = ms.map((x) => x.measuredAt);
    const beforeJs = js.map((x) => x.entryAt);
    combineTimeline(ms, js);
    expect(ms.map((x) => x.measuredAt)).toEqual(beforeMs);
    expect(js.map((x) => x.entryAt)).toEqual(beforeJs);
  });
});
