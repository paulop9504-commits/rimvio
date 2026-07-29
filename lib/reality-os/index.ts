export type { RealityPrimitiveDef, RealityPrimitiveId } from "@/lib/reality-os/primitives";
export {
  REALITY_PRIMITIVES,
  REALITY_PRIMITIVE_DEFS,
  realityPrimitiveDef,
} from "@/lib/reality-os/primitives";
export type { RealityComposition } from "@/lib/reality-os/compose";
export {
  composeRealityForSdkKind,
  listCompositionPrimitives,
} from "@/lib/reality-os/compose";
export type { RealityProjection } from "@/lib/reality-os/project";
export {
  primitiveForSlot,
  projectRealityComposition,
  revealFocusSlot,
} from "@/lib/reality-os/project";
export type {
  NodeDashboardTeaser,
  NodePipelineStage,
  NodePipelineStageState,
  NodeSpatialTeaser,
  WorkspaceNodeProjectionModel,
} from "@/lib/reality-os/node-projection-model";
export { buildWorkspaceNodeProjectionModel } from "@/lib/reality-os/node-projection-model";
export type {
  LinkedRealityCompose,
  LinkedRealityEdge,
} from "@/lib/reality-os/compose-linked";
export { composeLinkedReality } from "@/lib/reality-os/compose-linked";
export type { ContextRealityBundle, RealityPrimitiveStripRow } from "@/lib/reality-os/context-reality-store";
export {
  CONTEXT_REALITY_BUNDLE_META_KEY,
  CONTEXT_REALITY_BUNDLE_VERSION,
  advanceContextRealityFocus,
  clearContextRealityBundle,
  listRealityPrimitiveStrip,
  projectionFromBundle,
  readContextRealityBundle,
  resetContextRealityStoreForTests,
  seedContextRealityBundle,
  writeContextRealityBundle,
} from "@/lib/reality-os/context-reality-store";

