import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildTemplateSteps,
  loadTemplateSteps,
  saveTemplateSteps,
} from "./batchTemplateSteps";

describe("batchTemplateSteps", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("generuje kroki fermentacyjne dla wina/cydru/miodu", () => {
    const steps = buildTemplateSteps({
      type: "cydr",
      fruit: "jabłko",
      waterL: 10,
      targetAbv: 6,
    });
    expect(steps.length).toBeGreaterThanOrEqual(6);
    expect(steps[0]).toMatch(/Wyparz/);
    expect(steps.join(" ")).toMatch(/fermentacj/i);
  });

  it("generuje kroki maceracyjne dla nalewki", () => {
    const steps = buildTemplateSteps({
      type: "nalewka",
      fruit: "czarna porzeczka",
      waterL: 5,
      targetAbv: 35,
    });
    expect(steps.length).toBeGreaterThanOrEqual(6);
    expect(steps.join(" ")).toMatch(/maceracj/i);
  });

  it("zapis/odczyt roundtrip", () => {
    const steps = ["a", "b", "c"];
    saveTemplateSteps("batch-1", steps);
    expect(loadTemplateSteps("batch-1")).toEqual(steps);
  });
});
