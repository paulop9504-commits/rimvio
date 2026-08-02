/**
 * Rimvio Workspace State Model + Reality IDE Engine (STEP 4)
 *
 * Reality Object = 원본
 * Workspace Object = 작업용 Instance (mutations stay here)
 * History: Before → Mutation → After → Rollback
 */

export type {
  RealityObjectSeed,
  Workspace,
  WorkspaceConstraint,
  WorkspaceDraft,
  WorkspaceFilter,
  WorkspaceHistoryEntry,
  WorkspaceObject,
  WorkspaceObjectKind,
  WorkspaceSimulation,
  WorkspaceSnapshot,
  WorkspaceStateMutation,
  WorkspaceStateMutationType,
} from "@/lib/workspace/workspace-types";

export type {
  WorkspaceIdeInventory,
  WorkspaceIdeMode,
  WorkspaceIdePanel,
  WorkspaceIdeState,
} from "@/lib/workspace/workspace-state";

export {
  WORKSPACE_IDE_MODES,
  WORKSPACE_IDE_PANELS,
  buildWorkspaceIdeState,
  readWorkspaceIdeInventory,
  withWorkspaceIdeMode,
  withWorkspaceIdePanel,
} from "@/lib/workspace/workspace-state";

export type { OpenWorkspaceResult } from "@/lib/workspace/workspace";

export {
  addWorkspaceInstanceObject,
  addWorkspacePrepareDraft,
  addWorkspaceSimulationResult,
  assertWorkspaceDoesNotTouchReality,
  getWorkspaceIde,
  listWorkspaceManaged,
  openOsakaTripWorkspace,
  openWorkspaceFromContext,
  workspaceHistoryCount,
} from "@/lib/workspace/workspace";

export {
  applySnapshotToWorkspace,
  clearAllWorkspaceHistoryForTests,
  clearWorkspaceHistory,
  listWorkspaceHistory,
  recordWorkspaceHistory,
  redoWorkspaceHistory,
  rollbackWorkspaceHistory,
  snapshotWorkspace,
} from "@/lib/workspace/workspace-history";

export {
  WORKSPACE_STATE_UPDATED,
  addWorkspaceConstraint,
  addWorkspaceDraft,
  addWorkspaceObject,
  addWorkspaceSimulation,
  assertDoesNotMutateRealityObject,
  assertRealityObjectUnchanged,
  clearAllWorkspacesForTests,
  clearWorkspace,
  clearWorkspaceFilter,
  commitWorkspaceEngineChange,
  createWorkspace,
  createWorkspaceObjectFromReality,
  createWorkspaceObjectRef,
  kindFromRealityKind,
  listWorkspaces,
  patchWorkspaceObject,
  readWorkspace,
  readWorkspaceByContext,
  redoWorkspace,
  removeWorkspaceConstraint,
  removeWorkspaceObject,
  resolveWorkspaceEntity,
  rollbackWorkspace,
  setWorkspaceFilter,
} from "@/lib/workspace/workspace-store";

export {
  applyWorkspaceIntentToState,
  ensureWorkspaceState,
} from "@/lib/workspace/apply-workspace-intent";

export {
  WORKSPACE_ENGINE_MUTATION_TYPES,
  applyWorkspaceEngineMutation,
  intentToEngineMutation,
  runWorkspaceMutationEngine,
  type WorkspaceEngineApplyResult,
  type WorkspaceEngineMutation,
  type WorkspaceEngineMutationType,
} from "@/lib/workspace/mutation";
