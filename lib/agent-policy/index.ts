/**
 * Cursor ↔ Rimvio Agent Policy / Operating Constitution SSOT
 * ADR-048 (mutation) · ADR-049 (25 laws)
 */

export {
  AGENT_CONSTITUTION_VERSION,
  CURSOR_AGENT_POLICY_VERSION,
  AGENT_CONSTITUTION_LAWS,
  CURSOR_AGENT_POLICIES,
  AGENT_CONSTITUTION_BANDS,
  WORKSPACE_MUTATION_MODES,
  type AgentConstitutionLawId,
  type CursorAgentPolicyId,
  type WorkspaceMutationMode,
} from "@/lib/agent-policy/cursor-agent-policy";

export {
  resolveWorkspaceMutationMode,
  type WorkspaceMutationDecision,
} from "@/lib/agent-policy/resolve-workspace-mutation-mode";

export {
  resolveWorkspaceJobBoundary,
  type WorkspaceJobBoundary,
} from "@/lib/agent-policy/resolve-workspace-job-boundary";

export {
  beginAgentJob,
  isSoftNextTargetAllowed,
  resolveAgentJobTargetFromUtterance,
  type AgentJob,
  type AgentJobIntent,
  type AgentJobScope,
  type AgentJobTarget,
} from "@/lib/agent-policy/agent-job";

export {
  buildScoutFingerprintParts,
  fingerprintScoutQuery,
  isScoutFingerprintStale,
  type ScoutFingerprintParts,
} from "@/lib/agent-policy/scout-query-fingerprint";

export {
  runAgentP0Guards,
  type AgentP0GuardResult,
} from "@/lib/agent-policy/run-agent-p0-guards";

export {
  runAgentP1Guards,
  stampAgentIdempotencyKey,
  type AgentP1GuardResult,
  type AgentP1GuardPass,
  type AgentP1GuardBlock,
} from "@/lib/agent-policy/run-agent-p1-guards";

export {
  resolveAgentActionLevel,
  type AgentActionLevel,
  type ActionLevelGateResult,
} from "@/lib/agent-policy/action-level-gate";

export {
  resolveAmbiguityGate,
  type AmbiguityGateResult,
} from "@/lib/agent-policy/ambiguity-gate";

export {
  resolveConstraintCarryOver,
  clearJobLocalConstraints,
  isTargetStackUtterance,
  isLocaleDeixisUtterance,
  type ConstraintCarryOverResult,
} from "@/lib/agent-policy/constraint-carry-over";

export {
  resolveMutationScopeGuard,
  isPatchKindAllowed,
  type MutationScopeGateResult,
} from "@/lib/agent-policy/mutation-scope-guard";

export {
  assertAgentPostcondition,
  type PostconditionExpect,
  type PostconditionResult,
} from "@/lib/agent-policy/postcondition-check";

export {
  buildAgentIdempotencyKey,
  resolveIdempotencyGate,
  type IdempotencyGateResult,
} from "@/lib/agent-policy/idempotency-gate";

export {
  projectAgentTurnSurfaces,
  type AgentTurnSurfaces,
} from "@/lib/agent-policy/project-agent-turn-surfaces";

export {
  emptyConstraintMemory,
  mergeConstraintMemoryFromUtterance,
  applyConstraintMemoryToScoutQuery,
  constraintMemoryLinesKo,
  extractNearLabelKo,
  type ConstraintMemoryBag,
} from "@/lib/agent-policy/constraint-memory";

export {
  buildRecommendEvidence,
  gateRecommendCopy,
  type RecommendEvidence,
  type RecommendEvidenceKind,
} from "@/lib/agent-policy/evidence-gate";

export {
  buildAgentActionOwnership,
  ownershipSummaryKo,
  type AgentActionOwnership,
  type AgentActionActor,
  type AgentActionApproval,
} from "@/lib/agent-policy/action-ownership";

export {
  createAgentTraceEntry,
  appendAgentTrace,
  formatAgentTraceTimelineKo,
  type AgentTraceEntry,
  type AgentTraceKind,
} from "@/lib/agent-policy/agent-trace";

export {
  rememberConstraintsOnWorkspace,
  scoutQueryWithConstraintMemory,
  stampAgentConstitutionOnWorkspace,
} from "@/lib/agent-policy/stamp-constitution-on-workspace";
