import { describe, it, expect } from "vitest";
import { nextActions, STAGE_DURATIONS_DEFAULT } from "./nextActions";

const today = (s: string) => new Date(s);

describe("nextActions (frontend)", () => {
  it("dla burzliwej zwraca etę 7 dni do następnego etapu", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-05-20",
      today: today("2026-05-20T12:00:00Z"),
    });
    expect(r.upcoming[0].etaDays).toBe(7);
    expect(r.upcoming[0].stage).toBe("fermentacja-cicha");
  });

  it("uwzględnia fermentationDays z receptury", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-05-20",
      today: today("2026-05-20T12:00:00Z"),
      fermentationDays: 10,
    });
    expect(r.upcoming[0].etaDays).toBe(10);
  });

  it("po terminie pokazuje overdue=true i etaDays=0", () => {
    const r = nextActions({
      stage: "fermentacja-burzliwa",
      startDate: "2026-05-01",
      today: today("2026-06-15T12:00:00Z"),
    });
    expect(r.upcoming[0].overdue).toBe(true);
    expect(r.upcoming[0].etaDays).toBe(0);
  });

  it("butelkowanie nie ma upcoming", () => {
    const r = nextActions({
      stage: "butelkowanie",
      startDate: "2026-05-20",
      today: today("2026-06-01T12:00:00Z"),
    });
    expect(r.upcoming).toEqual([]);
  });

  it("default duration map jest spójna ze stałą", () => {
    expect(STAGE_DURATIONS_DEFAULT["fermentacja-burzliwa"]).toBeGreaterThan(0);
  });
});
