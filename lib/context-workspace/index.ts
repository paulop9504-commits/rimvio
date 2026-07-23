/**
 * Context Workspace SSOT — map-needed work before Commit.
 * NL → Workspace → State Transition → Commit → Globe
 */

export type {
  ContextSurfaceKind,
  ContextWorkspaceDomain,
  ContextWorkspaceFilter,
  ContextWorkspaceNode,
  ContextWorkspaceNodeKind,
  ContextWorkspaceOpenDetail,
  ContextWorkspaceOpenSource,
  ContextWorkspaceRelationshipEdge,
  ContextWorkspaceState,
  ContextWorkspaceStatus,
  ContextWorkspaceTransitionOp,
  WorkspaceWhyEntry,
} from "@/lib/context-workspace/types";
export {
  CONTEXT_WORKSPACE_VERSION,
  domainLabelKo,
} from "@/lib/context-workspace/types";

export {
  CONTEXT_WORKSPACE_CLOSE,
  CONTEXT_WORKSPACE_OPEN,
  CONTEXT_WORKSPACE_UPDATED,
  clearContextWorkspace,
  dispatchContextWorkspaceOpen,
  hasProvisionalContextWorkspace,
  hasProvisionalLodgingWorkspace,
  listDraftContextWorkspaceEventIds,
  readContextWorkspace,
  readContextWorkspaceExpanded,
  subscribeContextWorkspaceOpen,
  subscribeContextWorkspaceUpdated,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";

export {
  candidateToWorkspaceNode,
  graphDomainToWorkspaceDomain,
  lodgingCandidateToWorkspaceNode,
  lodgingHitToWorkspaceNode,
  openLodgingContextWorkspace,
  openMapContextWorkspace,
  placeHitToWorkspaceNode,
} from "@/lib/context-workspace/open-map-workspace";

export {
  applyWorkspaceTransition,
  mergeWorkspaceFilterFromGraphPredicate,
  parseWorkspaceUtteranceTransition,
} from "@/lib/context-workspace/apply-workspace-transition";

export {
  commitContextWorkspaceToGlobe,
  commitLodgingWorkspaceToGlobe,
} from "@/lib/context-workspace/commit-workspace-to-globe";

export {
  buildAppleMapsDeepLink,
  buildGoogleMapsDeepLink,
  buildGoogleMapsDirectionsDeepLink,
} from "@/lib/context-workspace/workspace-deep-links";

export {
  tryApplyWorkspaceLodgingTurn,
  tryApplyWorkspaceLodgingTurnSync,
  tryApplyWorkspacePromptTurn,
  tryApplyWorkspacePromptTurnSync,
} from "@/lib/context-workspace/try-apply-workspace-lodging-turn";

export {
  withWorkspaceRelationships,
  buildWorkspaceRelationshipEdges,
} from "@/lib/context-workspace/sync-workspace-relationships";

export {
  forcePinnedVisible,
  listPinnedWorkspaceNodes,
  mergePreservePinnedNodes,
} from "@/lib/context-workspace/merge-preserve-pinned";

export {
  resolveWorkspaceSearchDomain,
  workspaceDomainToToolDomain,
} from "@/lib/context-workspace/resolve-workspace-search-domain";

export {
  appendWorkspaceChatTurn,
  clearWorkspaceChat,
  readWorkspaceChat,
  subscribeWorkspaceChatUpdated,
  type WorkspaceChatRole,
  type WorkspaceChatTurn,
} from "@/lib/context-workspace/workspace-chat-store";

export {
  buildCapsuleProjection,
  listCapsuleProjections,
  readCapsuleCompilerIr,
  resumeCapsuleWorkspace,
  type CapsuleProjection,
} from "@/lib/context-workspace/resume-capsule-workspace";

export {
  CONTEXT_WORKSPACE_EXPAND,
  dispatchContextWorkspaceExpand,
  subscribeContextWorkspaceExpand,
} from "@/lib/context-workspace/workspace-expand-bridge";

export { appendWorkspacePreviewComposeTurn } from "@/lib/context-workspace/append-workspace-preview-turn";

export {
  estimateWorkspaceProgressPercent,
  relativeWorkspaceUpdateKo,
} from "@/lib/context-workspace/current-context-metrics";

export { buildWorkspaceCommitPreview } from "@/lib/context-workspace/build-commit-preview";
export type { WorkspaceCommitPreview } from "@/lib/context-workspace/build-commit-preview";
export { buildWorkspaceWhy } from "@/lib/context-workspace/build-workspace-why";
export { optimizeWorkspaceNodeRoute } from "@/lib/context-workspace/optimize-workspace-route";

export {
  resolveWorkspaceMapProvider,
  isAppleMapKitWorkspaceEnabled,
  isMapLibreWorkspaceEnabled,
} from "@/lib/context-workspace/map/workspace-map-provider";
export {
  readAppleMapKitClientConfig,
  readAppleMapKitServerEnv,
} from "@/lib/context-workspace/map/apple-mapkit-config";
