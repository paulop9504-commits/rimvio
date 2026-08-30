/**
 * Agent Decision Engine — one engine, five judgment levels.
 * Deterministic rails first; LLM is optional and never the only judge.
 */

export const DECISION_LEVELS = [0, 1, 2, 3, 4] as const;
export type DecisionLevel = (typeof DECISION_LEVELS)[number];

export const DECISION_CONTRACT_KINDS = [
  "ACT",
  "CONTINUE",
  "VERIFY",
  "REPLAN",
  "RETRY",
  "ASK_USER",
  "WAIT_APPROVAL",
  "COMPLETE",
  "ABORT",
] as const;

export type DecisionContractKind = (typeof DECISION_CONTRACT_KINDS)[number];

export type DecisionContract = {
  readonly decision: DecisionContractKind;
  readonly actionId: string | null;
  readonly toolId: string | null;
  readonly reason: string;
  readonly reasonKo: string;
  readonly confidence: number;
  readonly decisionLevel: DecisionLevel;
  readonly escalatedFrom: DecisionLevel | null;
  readonly alternatives: readonly DecisionAlternative[];
  readonly failureType: DecisionFailureType | null;
};

export type DecisionAlternative = {
  readonly id: string;
  readonly toolId: string;
  readonly labelKo: string;
  readonly score: number;
  readonly reasonKo: string;
};

export type DecisionFailureType =
  | "transient"
  | "retryable"
  | "configuration"
  | "dependency"
  | "logic"
  | "state"
  | "capability"
  | "permission"
  | "user_input"
  | "unrecoverable";

export type CompiledGoal = {
  readonly domain: string;
  readonly objective: string;
  readonly requirements: readonly string[];
  readonly subgoals: readonly CompiledSubgoal[];
  readonly constraints: readonly GoalConstraint[];
  readonly successCriteria: readonly GoalCriterion[];
};

export type CompiledSubgoal = {
  readonly id: string;
  readonly requirement: string;
  readonly satisfied: boolean;
};

export type GoalConstraint = {
  readonly key: string;
  readonly value: string | number | boolean;
  readonly source: "utterance" | "memory" | "inject";
};

export type GoalCriterion = {
  readonly id: string;
  readonly labelKo: string;
  readonly required: boolean;
  readonly met: boolean;
};

export type ApplicationStateSnapshot = {
  readonly application: string;
  readonly entities: readonly string[];
  readonly capabilities: readonly string[];
  readonly missingCapabilities: readonly string[];
  readonly infrastructure: readonly string[];
  readonly surfaces: readonly string[];
  readonly workflows: readonly string[];
  readonly integrations: Readonly<Record<string, boolean>>;
  readonly tests: { readonly passed: number; readonly total: number };
  readonly deployments: readonly string[];
  readonly permissions: readonly string[];
  readonly pendingApprovals: readonly string[];
  readonly recentActions: readonly string[];
  readonly recentObservations: readonly string[];
  readonly lines: readonly string[];
};

export type CapabilityMeta = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly toolId: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly preconditions: readonly string[];
  readonly postconditions: readonly string[];
  readonly dependencies: readonly string[];
  readonly conflicts: readonly string[];
  readonly riskLevel: "low" | "medium" | "high";
  readonly reversible: boolean;
  readonly verificationStrategy: "inspect" | "sandbox_test" | "e2e" | "none";
  readonly supportedDomains: readonly string[];
  readonly estimatedCost: number;
  readonly estimatedLatency: number;
};

export type ActionCandidate = {
  readonly actionId: string;
  readonly capabilityId: string;
  readonly toolId: string;
  readonly labelKo: string;
  readonly alreadyPresent: boolean;
  readonly missingDeps: readonly string[];
  readonly scores: ActionScores;
  readonly total: number;
};

export type ActionScores = {
  readonly goalProgress: number;
  readonly dependencyFit: number;
  readonly stateCompatibility: number;
  readonly capabilityConfidence: number;
  readonly verificationStrength: number;
  readonly userIntentAlignment: number;
  readonly riskPenalty: number;
  readonly costPenalty: number;
  readonly mutationPenalty: number;
};

export type DecisionEngineInput = {
  readonly utterance: string;
  readonly intent: string;
  readonly domain: string | null;
  readonly goal: CompiledGoal;
  readonly state: ApplicationStateSnapshot;
  readonly candidates: readonly ActionCandidate[];
  readonly lastObservationFailed?: boolean;
  readonly lastFailureType?: DecisionFailureType | null;
  readonly lastToolId?: string | null;
  readonly replanCount?: number;
  readonly retryCount?: number;
  readonly maxReplans?: number;
  readonly maxRetries?: number;
  readonly surface?: string | null;
  readonly focusedEntityIds?: readonly string[];
  readonly architectureConflict?: boolean;
  readonly forcedLevel?: DecisionLevel;
};
