import { describe, it, expect } from "vitest";
import { computeActualAbv } from "./abvFromMeasurements";
import type { Measurement } from "./api";

function m(
  partial: Partial<Measurement> & { measuredAt: string },
): Measurement {
  return {
    id: crypto.randomUUID(),
    batchId: "b1",
    brix: null,
    sg: null,
    temperatureC: null,
    note: null,
    createdAt: "2026-05-25T18:00:00.000Z",
    ...partial,
  };
}

describe("computeActualAbv", () => {
  it("zwraca null gdy mniej niż 2 pomiary", () => {
    expect(computeActualAbv([])).toBeNull();
    expect(
      computeActualAbv([m({ measuredAt: "2026-05-20T08:00:00Z", sg: 1.09 })]),
    ).toBeNull();
  });

  it("liczy ABV z pierwszego i ostatniego SG (chronologicznie)", () => {
    const list: Measurement[] = [
      m({ measuredAt: "2026-05-20T08:00:00Z", sg: 1.09 }),
      m({ measuredAt: "2026-05-30T08:00:00Z", sg: 1.02 }),
      m({ measuredAt: "2026-06-10T08:00:00Z", sg: 1.0 }),
    ];
    expect(computeActualAbv(list)).toBeCloseTo(11.81, 1);
  });

  it("akceptuje brix gdy brak SG", () => {
    const list: Measurement[] = [
      m({ measuredAt: "2026-05-20T08:00:00Z", brix: 12 }),
      m({ measuredAt: "2026-06-10T08:00:00Z", brix: 4 }),
    ];
    const r = computeActualAbv(list);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(3);
    expect(r!).toBeLessThan(6);
  });

  it("kolejność wejścia nie ma znaczenia (sortuje po dacie)", () => {
    const list: Measurement[] = [
      m({ measuredAt: "2026-06-10T08:00:00Z", sg: 1.0 }),
      m({ measuredAt: "2026-05-20T08:00:00Z", sg: 1.09 }),
    ];
    expect(computeActualAbv(list)).toBeCloseTo(11.81, 1);
  });

  it("zwraca null gdy ostatni odczyt nie ma ani sg ani brix", () => {
    const list: Measurement[] = [
      m({ measuredAt: "2026-05-20T08:00:00Z", sg: 1.09 }),
      m({ measuredAt: "2026-06-10T08:00:00Z", temperatureC: 22 }),
    ];
    expect(computeActualAbv(list)).toBeNull();
  });

  it("zwraca null gdy fg > og (fermentacja w tył)", () => {
    const list: Measurement[] = [
      m({ measuredAt: "2026-05-20T08:00:00Z", sg: 1.0 }),
      m({ measuredAt: "2026-06-10T08:00:00Z", sg: 1.05 }),
    ];
    expect(computeActualAbv(list)).toBeNull();
  });
});
