import { describe, it, expect } from "vitest";
import {
  GASIOR_HERO_VIDEOS,
  GASIOR_STAGE_IMAGES,
  gasiorImageForStage,
  pickRandomGasiorVideo,
} from "./batchStageAssets";

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

  it("GASIOR_HERO_VIDEOS zawiera wszystkie pliki z public/gasior", () => {
    expect(GASIOR_HERO_VIDEOS).toHaveLength(4);
    for (const src of GASIOR_HERO_VIDEOS) {
      expect(src).toMatch(/^\/gasior\/.+\.mp4$/);
    }
  });

  it("pickRandomGasiorVideo zwraca jeden z dostępnych MP4", () => {
    const src = pickRandomGasiorVideo();
    expect(GASIOR_HERO_VIDEOS).toContain(src);
  });
});
