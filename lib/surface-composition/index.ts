/**
 * Surface Composition Runtime — graph + layout from Surface Engine only.
 * @see docs/RIMVIO_COMPOSABLE_SURFACE_UI_V1_REPORT.md
 */
export {
  SURFACE_COMPOSITION_VERSION,
  type LayoutSlot,
  type SurfaceMfeId,
  type SurfaceNode,
  type SurfaceGraph,
  type CompositionLayout,
  type SurfaceCompositionFrame,
  type DispatchSurfaceAction,
} from "@/lib/surface-composition/surface-node-contract";

export { buildSurfaceGraph } from "@/lib/surface-composition/build-surface-graph";
export { resolveCompositionLayout } from "@/lib/surface-composition/resolve-composition-layout";
export {
  composeSurfaceFrame,
  surfaceCompositionFrameKey,
} from "@/lib/surface-composition/compose-surface-frame";
export {
  resolveSurfaceMfeId,
  resolveUiComponents,
} from "@/lib/surface-composition/mfe-registry";
export {
  collapseSurfaceDecisionStream,
  hasActiveDecisionStream,
  shouldRenderLatentSuggestionLayers,
  resetSurfaceCollapseStateForTests,
  type SurfaceCollapseResult,
  type SurfaceTransitionEvent,
  type SurfaceTransitionKind,
} from "@/lib/surface-composition/surface-collapse-controller";
