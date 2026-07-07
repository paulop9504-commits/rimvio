export type {
  GlobeResourceReelFocusDetail,
  GlobeResourceReelItem,
  GlobeResourceReelKind,
  GlobeResourceReelSource,
  GlobeResourceReelSurface,
} from "@/lib/globe/resource-reel/types";
export {
  buildResourceReelResourceId,
  dispatchGlobeResourceReelFocus,
  dispatchGlobeResourceReelStage,
  forwardEateryFocusToResourceReel,
  forwardLodgingFocusToResourceReel,
  subscribeGlobeResourceReelFocus,
  subscribeGlobeResourceReelStage,
} from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
export { buildGlobeResourceReelItems } from "@/lib/globe/resource-reel/build-globe-resource-reel-items";
