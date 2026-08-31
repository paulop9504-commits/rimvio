/**
 * Rimvio Agent OS — Main / Hub / Worker boundary (P0).
 */

export {
  RIMVIO_AGENT_ROLES,
  type RimvioAgentRole,
  inferRimvioAgentRole,
  isMainAgentRole,
  isHubAgentRole,
  isWorkerAgentRole,
} from "@/lib/agent-os/agent-role";

export {
  MAIN_AGENT_LOOP_PHASES,
  MAIN_AGENT_LOOP_LIMITS,
  type MainAgentLoopPhase,
  workspacePhaseToMainPhase,
  hubStatusToMainPhase,
} from "@/lib/agent-os/main-agent-loop-phase";

export {
  type MainAgentContext,
  type MainAgentWorkspaceRef,
  buildMainAgentContext,
} from "@/lib/agent-os/main-agent-context";

export {
  type HubAgentContext,
  buildHubAgentContext,
} from "@/lib/agent-os/hub-agent-context";

export {
  type CapabilityDevelopmentRequest,
  type CapabilityDevelopmentRequestStatus,
  type CapabilityDevelopmentRequestPriority,
  readCapabilityDevelopmentRequests,
  createCapabilityDevelopmentRequest,
  capabilityDevelopmentRequestFromReuseGate,
  submitCapabilityDevelopmentRequestToHub,
  resetCapabilityDevelopmentRequestsForTests,
  markCapabilityDevelopmentRequestAccepted,
} from "@/lib/agent-os/capability-development-request";

export {
  type SharedExecutionState,
  readSharedExecutionState,
} from "@/lib/agent-os/shared-execution-state";

export {
  MAIN_INTERACTION_MODES,
  type MainInteractionMode,
  resolveInteractionMode,
  shouldUseWorkspace,
  workspaceModeFromInteraction,
} from "@/lib/agent-os/resolve-interaction-mode";

export {
  type SelectNextCapabilityInput,
  type SelectNextCapabilityResult,
  selectNextCapabilityFromState,
} from "@/lib/agent-os/select-next-capability";

export {
  MAIN_AGENT_CAPABILITY_POLICY,
  PRODUCER_SUBMIT_CHECKLIST,
  REVIEWER_CHECKLIST,
  RIMVIO_CAPABILITY_STANDARD_VERSION,
} from "@/lib/hub/standards";

export {
  runTrustSubmissionPipeline,
  canCapabilityCall,
  promoteTrustLane,
} from "@/lib/trust-pipeline";

export {
  invokeCapabilityIsolated,
  admitCapabilityInvoke,
  redactSecrets,
  agentMayReceiveGitHubToken,
} from "@/lib/capability-runtime";

export {
  AGENT_TURN_STATUSES,
  AGENT_TURN_LIMITS,
  AGENT_TURN_EVENT_KINDS,
  runAgentTurn,
  understandRequest,
  inspectCurrentState,
  decideAfterObservation,
  decideAfterVerification,
  verifyAgentTurn,
  generateFinalReport,
  formatFinalReportKo,
  createAgentTurn,
  transitionAgentTurn,
  canTransition,
  applyAgentTurnEventToLog,
  requestAgentTurnPause,
  injectAgentTurnRequirement,
  resetAgentTurnInterruptsForTests,
  type AgentTurn,
  type AgentTurnStatus,
  type AgentFinalReport,
  type AgentTurnResult,
  type AgentTurnEvent,
} from "@/lib/agent-os/agent-turn";

export {
  decideWithEngine,
  selectDecisionLevel,
  compileExecutableGoal,
  snapshotApplicationState,
  discoverActionCandidates,
  classifyDecisionFailure,
  generateAlternatives,
  mutatePlanSteps,
  resolveAmbiguity,
  verifyGoalLevels,
  goalSatisfied,
  refreshGoalAgainstState,
  type DecisionLevel,
  type DecisionContract,
  type CompiledGoal,
} from "@/lib/agent-os/decision-engine";

export {
  generateLoopFromUtterance,
  lintLoopDefinition,
  loopDefinitionToCode,
  parseLoopCode,
  compileLoopToRuntimeSteps,
  testLoopDefinition,
  packageLoopAsCapability,
  wrapCapabilityAsLoop,
  resetLoopDefinitionsForTests,
  type LoopDefinition,
  type LoopBuilderMode,
} from "@/lib/agent-os/loop-builder";
