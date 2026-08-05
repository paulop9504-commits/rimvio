export {
  USJ_ANCHOR_RE,
  USJ_GEO_ID,
  buildAnchorLodgingContinuumUtterance,
  isNearLodgingUtterance,
  resolveRealityAnchorFromUtterance,
  type RealityAnchorHit,
} from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";

export { ensureWorkspaceAnchorNode } from "@/lib/context-workspace/reality-anchor/ensure-workspace-anchor-node";

export {
  extractPlaceLocateQuery,
  isPlaceLocateUtterance,
  resolvePlaceLocate,
  resolvePlaceLocateSync,
  tryApplyPlaceLocateFromUtterance,
  tryApplyPlaceLocateFromUtteranceSync,
  applyAddressCandidateSelection,
  type PlaceLocateApplyResult,
  type PlaceLocateHit,
} from "@/lib/context-workspace/reality-anchor/place-locate";
