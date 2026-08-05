/**
 * Reality Provider Runtime — public barrel (ADR-051).
 */

export {
  REALITY_NEED_IDS,
  REALITY_PROVIDER_IDS,
  type RealityNeed,
  type RealityNeedId,
  type RealityProviderCandidate,
  type RealityProviderId,
  type RealityProviderResolution,
} from "@/lib/reality-provider/types";

export { resolveRealityNeedFromUtterance } from "@/lib/reality-provider/resolve-need";
export { resolveRealityProvider } from "@/lib/reality-provider/resolve-provider";
export {
  tryApplyRealityAbsorbFromUtterance,
  type RealityAbsorbResult,
} from "@/lib/reality-provider/run-reality-absorb";

export {
  tryApplyNetworkAbsorbWorkspaceTurn,
  type NetworkAbsorbSoftChip,
  type NetworkAbsorbWorkspaceTurnResult,
} from "@/lib/reality-provider/apply-network-absorb-workspace-turn";
export type {
  RealityLineObject,
  RealityRailNetworkBundle,
  RealityStationObject,
} from "@/lib/reality-provider/normalize-types";
export type {
  NetworkAbsorbFamily,
  NetworkAbsorbProjectionState,
  NetworkAbsorbVisibilityOp,
} from "@/lib/reality-provider/network-absorb-projection";
export {
  getNetworkAbsorbProjection,
  getNetworkAbsorbVisibleLineIds,
  setNetworkAbsorbProjection,
  subscribeNetworkAbsorbProjection,
} from "@/lib/reality-provider/network-absorb-projection-store";
export type { RealityPoiGeometryObject } from "@/lib/reality-provider/normalize-poi-geometry";
export {
  absorbPoiGeometryForPlace,
  type AbsorbPoiGeometryResult,
} from "@/lib/reality-provider/absorb-poi-geometry";
export {
  getPoiGeometryOverlay,
  clearPoiGeometryOverlay,
  subscribePoiGeometryOverlay,
} from "@/lib/reality-provider/poi-geometry-store";
