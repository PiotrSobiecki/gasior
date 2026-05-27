import { describe, it, expect } from "vitest";
import { nextActions, STAGE_DURATIONS_DEFAULT } from "./nextActions";

// Stała "dzisiaj" do testów deterministycznych.
const today = (s: string) => new Date(s);

describe("nextActions — etap burzliwy", () => {
  it("zaraz po starcie pokazuje: za 7 dni zlewanie (cicha)", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-05-20",
      today: today("2026-05-20T12:00:00Z"),
    });
    expect(r.currentLabel).toMatch(/burzliw/i);
    expect(r.upcoming[0].action).toMatch(/zlewani|cicha/i);
    expect(r.upcoming[0].etaDays).toBe(STAGE_DURATIONS_DEFAULT["fermentacja-burzliwa"]);
  });

  it("używa fermentationDays z receptury zamiast domyślnego dla burzliwej", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-05-20",
      today: today("2026-05-20T12:00:00Z"),
      fermentationDays: 14,
    });
    expect(r.upcoming[0].etaDays).toBe(14);
  });

  it("po połowie etapu eta maleje", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-05-20",
      today: today("2026-05-23T12:00:00Z"),
    });
    expect(r.upcoming[0].etaDays).toBeLessThan(
      STAGE_DURATIONS_DEFAULT["fermentacja-burzliwa"],
    );
    expect(r.upcoming[0].etaDays).toBeGreaterThanOrEqual(0);
  });

  it("po przekroczeniu czasu etapu eta = 0 (i etykieta 'pora na X')", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-05-20",
      today: today("2026-06-10T12:00:00Z"),
    });
    expect(r.upcoming[0].etaDays).toBe(0);
    expect(r.upcoming[0].overdue).toBe(true);
  });
});

describe("nextActions — łańcuch etapów", () => {
  it("pokazuje wszystkie kolejne etapy w kolejności", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-05-20",
      today: today("2026-05-20T12:00:00Z"),
    });
    expect(r.upcoming.map((u) => u.stage)).toEqual([
      "fermentacja-cicha",
      "dojrzewanie",
      "butelkowanie",
    ]);
  });

  it("z etapu 'cicha' upcoming to dojrzewanie i butelkowanie", () => {
    const r = nextActions({
      stage: "fermentacja-cicha",
      startDate: "2026-05-20",
      today: today("2026-05-20T12:00:00Z"),
    });
    expect(r.upcoming.map((u) => u.stage)).toEqual([
      "dojrzewanie",
      "butelkowanie",
    ]);
  });

  it("dla etapu 'butelkowanie' upcoming jest puste (ostatni etap)", () => {
    const r = nextActions({
      stage: "butelkowanie",
      startDate: "2026-05-20",
      today: today("2026-05-20T12:00:00Z"),
    });
    expect(r.upcoming).toEqual([]);
    expect(r.currentLabel).toMatch(/butelkowani/i);
  });
});

describe("nextActions — odporność", () => {
  it("przy startDate w przyszłości eta to pełny czas etapu", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-06-01",
      today: today("2026-05-20T12:00:00Z"),
    });
    expect(r.upcoming[0].etaDays).toBe(
      STAGE_DURATIONS_DEFAULT["fermentacja-burzliwa"],
    );
  });

  it("kolejne wskaźniki są skumulowane (cicha bazuje na końcu burzliwej)", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-05-20",
      today: today("2026-05-20T12:00:00Z"),
    });
    expect(r.upcoming[1].etaDays).toBeGreaterThan(r.upcoming[0].etaDays);
  });
});
