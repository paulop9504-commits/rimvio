export {
  USJ_ANCHOR_RE,
  USJ_GEO_ID,
  buildAnchorLodgingContinuumUtterance,
  extractNearPlaceLabelFromUtterance,
  isNearLodgingUtterance,
  resolveRealityAnchorFromUtterance,
  resolveRealityAnchorFromUtteranceAsync,
  type RealityAnchorHit,
} from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";

export {
  assertSpatialAnchorResolved,
  isNearScoutUtterance,
  type AssertSpatialAnchorResolvedResult,
  type SpatialAnchorFailCode,
} from "@/lib/context-workspace/reality-anchor/assert-spatial-anchor-resolved";

export {
  gateNearScoutAnchor,
  gateNearScoutAnchorAsync,
  type GateNearScoutAnchorResult,
} from "@/lib/context-workspace/reality-anchor/gate-near-scout-anchor";

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
