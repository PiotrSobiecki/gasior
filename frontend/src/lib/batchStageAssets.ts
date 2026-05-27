import type { BatchStage } from "./api";
import { BATCH_STAGE_LABELS } from "./api";

/** Animowane MP4 gąsiora per etap — `public/gasior/*.mp4`. */
export const GASIOR_STAGE_IMAGES: Record<BatchStage, string> = {
  "fermentacja-burzliwa": "/gasior/fermentacja-burzliwa.mp4",
  "fermentacja-cicha": "/gasior/fermentacja-cicha.mp4",
  dojrzewanie: "/gasior/dojrzewanie.mp4",
  butelkowanie: "/gasior/butelkowanie.mp4",
};

export function gasiorImageForStage(stage: BatchStage): string {
  return GASIOR_STAGE_IMAGES[stage];
}

export function gasiorAltForStage(stage: BatchStage): string {
  return `Gąsior — etap: ${BATCH_STAGE_LABELS[stage]}`;
}
