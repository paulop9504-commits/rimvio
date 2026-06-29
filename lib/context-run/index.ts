export type {
  ContextRunState,
  ContextRunSurfaceKind,
  ContextRunSurfaceResolution,
  ExecutionDecisionKind,
} from "@/lib/context-run/types";

export {
  decideComposerExecution,
  decideNodeExecution,
  decideRiskOperation,
  decideRunTurn,
  decideSlotExecution,
  mergeExecutionDecision,
  type CommitAutoEnvelope,
  type ComposerDecisionPhase,
  type RiskOperation,
  type RunGraphNodeId,
  type SlotId,
} from "@/lib/context-run/execution-decision";

export {
  assertCommitPermitted,
  ContextRunCommitBlockedError,
  isCommitPermitted,
} from "@/lib/context-run/commit-gate";

export type { CommitAutoEnvelope as ContextRunCommitAutoEnvelope } from "@/lib/context-run/execution-decision";

export {
  assertSurfaceMatchesDecision,
  resolveExecutionSurface,
  resolvePrimarySurface,
  surfacesAllowedForDecision,
  type ContextRunSurfaceResolutionFull,
  type RunGraphNode,
  type SurfaceEffectKind,
} from "@/lib/context-run/surface-resolver";

export {
  buildComposerGraphId,
  resolveGlobeComposerSurface,
  type ComposerSurfaceEffect,
  type GlobeComposerSurfaceResolution,
} from "@/lib/context-run/resolve-globe-composer-surface";

export type {
  ExecutionFeedArtifact,
  ExecutionFeedItem,
  ExecutionFeedPill,
  ExecutionFeedState,
} from "@/lib/context-run/execution-feed-types";

export {
  dispatchExecutionFeedArtifact,
  dispatchExecutionFeedArtifactTab,
  dispatchExecutionFeedClear,
  dispatchExecutionFeedGoal,
  dispatchExecutionFeedStep,
  dispatchExecutionFeedTogglePill,
  readExecutionFeedState,
  subscribeExecutionFeedChange,
} from "@/lib/context-run/execution-feed-bridge";

export { commitTextContextIngress } from "@/lib/context-run/commit-text-context";
export { dispatchContextRun } from "@/lib/context-run/dispatch-context-run";
export { bindSituation } from "@/lib/context-run/bind-situation";
export { planContextRun } from "@/lib/context-run/plan-context-run";
export {
  clearRunState,
  completeRunState,
  CONTEXT_RUN_STORAGE_KEY,
  ensureRunState,
  readActiveRunState,
  touchRunStateNode,
} from "@/lib/context-run/run-state-store";

export {
  marketComposeRunNode,
  reconstructExecutionFeedFromRunState,
  subscribeContextRunWatcher,
} from "@/lib/context-run/watcher-reconstruct";

export {
  cancelExecutionFeedDismiss,
  finishContextRun,
  scheduleExecutionFeedDismiss,
  shouldRetainExecutionFeed,
  EXECUTION_FEED_DONE_TTL_MS,
  EXECUTION_FEED_IDLE_TTL_MS,
} from "@/lib/context-run/execution-feed-lifecycle";

export { syncMarketWizardStepToFeed } from "@/lib/context-run/sync-market-compose-to-feed";

export type {
  BoundSituation,
  ContextRunEffectHandlers,
  ContextRunIngress,
  ContextRunPlan,
  ContextRunPlanKind,
  ContextRunTurnResult,
} from "@/lib/context-run/ingress-types";
