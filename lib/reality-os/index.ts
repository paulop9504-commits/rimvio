/**
 * Reality OS — Architecture Foundation + Primitives (ADR-034).
 *
 * Rimvio is a Reality Operating System — not a travel app.
 * Existing primitive/projection modules are preserved; Foundation is additive.
 */

// ── Architecture Foundation ────────────────────────────────────────
export {
  REALITY_OS_LAYERS,
  REALITY_OS_LAYER_AUTHORITY,
  REALITY_OS_PRINCIPLES,
  REALITY_OS_PRODUCT_IDENTITY,
  assertAiCannotCommit,
  assertCommitRequiresUserApproval,
  assertNoDirectRealityMutation,
  assertRealityOsPrinciple,
  isGlobeRealityViewOnly,
  type RealityOsLayerId,
  type RealityOsPrincipleId,
} from "@/lib/reality-os/constitution";

export {
  REALITY_OS_LAYER_MODULES,
  REALITY_OS_LOOP,
  type AgentToDraftInterface,
  type CommitToRealityInterface,
  type ContextToWorkspaceInterface,
  type DraftToSimulationInterface,
  type PrepareToCommitInterface,
  type RealityOsAgentHandle,
  type RealityOsCommitHandle,
  type RealityOsContextHandle,
  type RealityOsDraftHandle,
  type RealityOsGlobeView,
  type RealityOsGraphHandle,
  type RealityOsLayerHandle,
  type RealityOsLayerInterface,
  type RealityOsLoopStage,
  type RealityOsPrepareHandle,
  type RealityOsSimulationHandle,
  type RealityOsWorkspaceHandle,
  type RealityToGlobeInterface,
  type WorkspaceToGraphInterface,
} from "@/lib/reality-os/types";

export {
  REALITY_OS_EVENT_ALIASES,
  REALITY_OS_EVENT_NAMES,
  clearRealityOsEventListenersForTests,
  emitRealityOsEvent,
  makeRealityOsEventBase,
  subscribeRealityOsEvents,
  type RealityOsCommitEvent,
  type RealityOsConstitutionViolationEvent,
  type RealityOsEvent,
  type RealityOsEventName,
  type RealityOsPrepareEvent,
  type RealityOsSimulationEvent,
} from "@/lib/reality-os/events";

export {
  buildAgentToDraftInterface,
  buildCommitToRealityInterface,
  buildContextToWorkspaceInterface,
  buildPrepareToCommitInterface,
  buildRealityToGlobeInterface,
  buildWorkspaceToGraphInterface,
  canTransitionRealityOsLayer,
  describeRealityOsArchitecture,
  gateRealityOsOperation,
  listRealityOsLayerInterfaces,
  resolveRealityOsModules,
  validateRealityOsTransition,
  type RealityOsArchitectureSnapshot,
} from "@/lib/reality-os/runtime";

// ── Existing Primitives / Projection (ADR-034) — do not remove ─────
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
