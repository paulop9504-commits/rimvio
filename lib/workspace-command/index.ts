/**
 * Rimvio Workspace Command Runtime — Reality OS Draft Environment
 *
 * NL → Intent → Proposal → Draft Mutation → Impact → Apply → Projection
 * Globe Reality = Read Only
 */

export type {
  DraftMutation,
  DraftMutationStatus,
  RealityDiff,
  WorkspaceActionProposal,
  WorkspaceCommand,
  WorkspaceCommandHistoryEntry,
  WorkspaceCommandRuntimeOk,
  WorkspaceCommandRuntimeReject,
  WorkspaceCommandRuntimeResult,
  WorkspaceDraftEventDetail,
  WorkspaceImpact,
  WorkspaceIntent,
  WorkspaceIntentAction,
  WorkspaceMutation,
  WorkspaceProjectionUpdateDetail,
} from "@/lib/workspace-command/types";
export { WORKSPACE_INTENT_ACTIONS } from "@/lib/workspace-command/types";

export {
  createWorkspaceCommand,
  parseWorkspaceCommand,
} from "@/lib/workspace-command/command-parser";

export {
  looksLikeForbiddenGlobeCommit,
  resolveWorkspaceIntent,
} from "@/lib/workspace-command/intent-resolver";

export {
  applyWorkspaceMutation,
  buildWorkspaceMutation,
} from "@/lib/workspace-command/workspace-mutation";

export {
  assertActiveWorkspace,
  assertWorkspaceMutationAllowed,
  readActiveWorkspaceDraft,
  type ActiveWorkspaceSnapshot,
} from "@/lib/workspace-command/workspace-store";

export {
  WORKSPACE_DRAFT_APPLIED,
  WORKSPACE_DRAFT_CREATED,
  WORKSPACE_DRAFT_UPDATED,
  WORKSPACE_PROJECTION_UPDATED,
  dispatchWorkspaceDraftEvent,
  dispatchWorkspaceProjectionUpdate,
  subscribeWorkspaceDraftEvents,
  subscribeWorkspaceProjectionUpdated,
} from "@/lib/workspace-command/projection-event";

export { proposeDraftAction } from "@/lib/workspace-command/draft-action-engine";
export {
  analyzeDraftImpact,
  impactLinesKo,
} from "@/lib/workspace-command/impact-analyzer";
export {
  buildRealityDiffFromIntent,
  formatRealityDiffGitStyleKo,
  formatRealityDiffPreviewKo,
} from "@/lib/workspace-command/reality-diff";
export {
  applyDraftMutation,
  rejectDraftMutation,
} from "@/lib/workspace-command/apply-draft-mutation";
export {
  clearDraftMutationsForTests,
  listProposedDrafts,
  listDraftMutations,
  readDraftMutation,
} from "@/lib/workspace-command/draft-mutation-store";
export {
  appendCommandHistory,
  clearCommandHistoryForTests,
  listCommandHistory,
} from "@/lib/workspace-command/command-history";

export { runWorkspaceCommandRuntime } from "@/lib/workspace-command/run-workspace-command-runtime";
