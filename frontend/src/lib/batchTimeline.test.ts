import { describe, it, expect } from "vitest";
import { daysSinceStart, formatDaysSince } from "./batchTimeline";

describe("daysSinceStart", () => {
  it("zwraca 0 jeśli dziś = data startu", () => {
    expect(daysSinceStart("2026-05-25", new Date("2026-05-25T12:00:00Z"))).toBe(
      0,
    );
  });

  it("zwraca dodatnią liczbę dni dla przeszłej daty startu", () => {
    expect(daysSinceStart("2026-05-20", new Date("2026-05-25T00:00:00Z"))).toBe(
      5,
    );
  });

  it("zwraca ujemną liczbę dla przyszłej daty startu", () => {
    expect(daysSinceStart("2026-06-01", new Date("2026-05-25T00:00:00Z"))).toBe(
      -7,
    );
  });

  it("traktuje datę start jako pełen dzień (ignoruje godziny dziś)", () => {
    expect(daysSinceStart("2026-05-20", new Date("2026-05-25T23:59:00Z"))).toBe(
      5,
    );
  });
});

describe("formatDaysSince", () => {
  it("formatuje 0 jako 'dziś'", () => {
    expect(formatDaysSince(0)).toBe("dziś");
  });
  it("formatuje 1 jako '1 dzień'", () => {
    expect(formatDaysSince(1)).toBe("1 dzień");
  });
  it("formatuje 2-4 jako 'X dni' (forma mnoga)", () => {
    expect(formatDaysSince(2)).toBe("2 dni");
    expect(formatDaysSince(3)).toBe("3 dni");
    expect(formatDaysSince(4)).toBe("4 dni");
  });
  it("formatuje 5+ jako 'X dni'", () => {
    expect(formatDaysSince(5)).toBe("5 dni");
    expect(formatDaysSince(30)).toBe("30 dni");
  });
  it("formatuje wartość ujemną jako 'za X dni'", () => {
    expect(formatDaysSince(-3)).toBe("za 3 dni");
    expect(formatDaysSince(-1)).toBe("za 1 dzień");
  });
});
