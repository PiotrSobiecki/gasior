import { describe, it, expect } from "vitest";
import { GASIOR_STAGE_IMAGES, gasiorImageForStage } from "./batchStageAssets";

describe("batchStageAssets", () => {
  it("ma obrazek dla każdego etapu fermentacji", () => {
    const stages = Object.keys(GASIOR_STAGE_IMAGES);
    expect(stages).toHaveLength(4);
    for (const stage of stages) {
      expect(gasiorImageForStage(stage as keyof typeof GASIOR_STAGE_IMAGES)).toMatch(
        /^\/gasior\/.+\.mp4$/,
      );
    }
  });
});
