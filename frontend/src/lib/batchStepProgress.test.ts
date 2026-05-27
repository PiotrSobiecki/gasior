import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadCheckedStepIndices,
  saveCheckedStepIndices,
} from "./batchStepProgress";

describe("batchStepProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("loadCheckedStepIndices zwraca pusty set gdy brak zapisu", () => {
    expect(loadCheckedStepIndices("batch-1").size).toBe(0);
  });

  it("save/load roundtrip", () => {
    saveCheckedStepIndices("batch-1", new Set([2, 0, 2]));
    expect([...loadCheckedStepIndices("batch-1")]).toEqual([0, 2]);
  });
});
