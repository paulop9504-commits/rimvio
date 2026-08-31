export {
  DECISION_LEVELS,
  DECISION_CONTRACT_KINDS,
  type DecisionLevel,
  type DecisionContractKind,
  type DecisionContract,
  type DecisionAlternative,
  type DecisionFailureType,
  type CompiledGoal,
  type CompiledSubgoal,
  type GoalConstraint,
  type GoalCriterion,
  type ApplicationStateSnapshot,
  type CapabilityMeta,
  type ActionCandidate,
  type ActionScores,
  type DecisionEngineInput,
} from "@/lib/agent-os/decision-engine/types";

export { selectDecisionLevel, shouldEscalate, complexityScore } from "@/lib/agent-os/decision-engine/complexity";
export {
  compileExecutableGoal,
  refreshGoalAgainstState,
  extractConstraints,
  mergeConstraints,
  goalSatisfied,
} from "@/lib/agent-os/decision-engine/goal-compiler";
export { snapshotApplicationState, capabilityPresent } from "@/lib/agent-os/decision-engine/state-snapshot";
export {
  listDecisionCapabilities,
  getDecisionCapability,
  toolRequiresApproval,
  knownGatewayTool,
} from "@/lib/agent-os/decision-engine/capability-catalog";
export {
  discoverActionCandidates,
  pickNextCandidate,
  firstMissingDependency,
} from "@/lib/agent-os/decision-engine/candidates";
export { classifyDecisionFailure, actionForFailure } from "@/lib/agent-os/decision-engine/failure";
export { generateAlternatives } from "@/lib/agent-os/decision-engine/alternatives";
export { mutatePlanSteps, shouldReplan } from "@/lib/agent-os/decision-engine/plan-mutation";
export { resolveAmbiguity } from "@/lib/agent-os/decision-engine/ambiguity";
export { verifyGoalLevels } from "@/lib/agent-os/decision-engine/verification-levels";
export { decideWithEngine, decisionKindToTurn } from "@/lib/agent-os/decision-engine/decide";
