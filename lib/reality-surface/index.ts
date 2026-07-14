export type {
  RealitySurfaceBridgeProjection,
  RealitySurfaceContextProjection,
  RealitySurfaceExcludedLayer,
  RealitySurfaceFlowProjection,
  RealitySurfaceIncludedLayer,
  RealitySurfaceProjectionBundle,
  RealitySurfaceRuntimeProjection,
  RealitySurfaceScope,
} from "@/lib/reality-surface/types";
export {
  assertNotRealitySurfaceViolation,
  composeRealitySurfaceProjectionBundle,
  REALITY_SURFACE_EXCLUDED_LAYERS,
  REALITY_SURFACE_INCLUDED_LAYERS,
  REALITY_SURFACE_SCOPE,
} from "@/lib/reality-surface/types";
export {
  composeRealitySurfaceFromGlobeIngress,
  composeRealitySurfaceFromBlueprint,
  type RealitySurfaceSession,
} from "@/lib/reality-surface/project-globe-ingress";
export {
  advanceRealitySurfaceDestination,
  advanceRealitySurfaceDepartureHub,
  blueprintNeedsDepartureConfirm,
  blueprintNeedsDestination,
  patchTravelBlueprintForDestination,
  patchTravelBlueprintForDepartureHub,
  resolveDestinationFromMessage,
  DESTINATION_CHOICE_LABELS,
} from "@/lib/reality-surface/advance-ingress-flow";
export { approveRealitySurfaceExecutionPlan } from "@/lib/reality-surface/approve-reality-surface-execution-plan";
export { projectBridgeMapArcs } from "@/lib/reality-surface/project-bridge-map-arcs";
export {
  resolveBridgeLegCoord,
  resolveBridgePathCoords,
  type BridgeLegCoord,
} from "@/lib/reality-surface/resolve-bridge-leg-coords";
