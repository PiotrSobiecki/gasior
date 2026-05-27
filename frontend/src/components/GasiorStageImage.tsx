import type { BatchStage } from "../lib/api";
import { gasiorAltForStage, gasiorImageForStage } from "../lib/batchStageAssets";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-14 w-auto",
  md: "h-32 w-auto",
  lg: "h-44 w-auto",
  xl: "h-52 w-auto max-w-full sm:h-56",
};

type Props = {
  stage: BatchStage;
  size?: Size;
  className?: string;
};

export function GasiorStageImage({ stage, size = "md", className = "" }: Props) {
  return (
    <video
      src={gasiorImageForStage(stage)}
      aria-label={gasiorAltForStage(stage)}
      className={`object-contain ${SIZE_CLASS[size]} ${className}`.trim()}
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      preload="metadata"
    />
  );
}
