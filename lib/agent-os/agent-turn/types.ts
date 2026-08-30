/**
 * Autonomous Agent Turn — request → verify → final report.
 * Does not replace Hub/Travel controllers; wraps them.
 */

import type { UserIntent } from "@/lib/agent/conversation/intent-types";
import type { AgentObservation } from "@/lib/agent/types";

export const AGENT_TURN_STATUSES = [
  "idle",
  "understanding",
  "inspecting",
  "planning",
  "executing",
  "observing",
  "verifying",
  "replanning",
  "waiting_approval",
  "paused",
  "completed",
  "failed",
  "reported",
] as const;

export type AgentTurnStatus = (typeof AGENT_TURN_STATUSES)[number];

export const AGENT_TURN_DECISIONS = [
  "continue",
  "replan",
  "retry",
  "ask_user",
  "wait_approval",
  "complete",
  "verify",
  "fail",
] as const;

export type AgentTurnDecisionKind = (typeof AGENT_TURN_DECISIONS)[number];

export type AgentTurnDecision = {
  readonly kind: AgentTurnDecisionKind;
  readonly reasonKo: string;
  readonly stepId?: string;
};

export type AgentTurnUnderstand = {
  readonly intent: UserIntent;
  readonly domain: string | null;
  readonly entity: string | null;
  readonly action: string | null;
  readonly requestedOutcome: string;
  readonly requestedState: string | null;
  readonly conversational: boolean;
  readonly executable: boolean;
  readonly confidence: "high" | "medium" | "low";
  readonly reason: string;
};

export type AgentTurnInspection = {
  readonly type: "application_state";
  readonly platformName: string;
  readonly entities: readonly string[];
  readonly capabilities: readonly string[];
  readonly missingCapabilities: readonly string[];
  readonly connections: Readonly<Record<string, boolean>>;
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly lines: readonly string[];
};

export type AgentTurnActionRecord = {
  readonly actionId: string;
  readonly sessionId: string;
  readonly appId: string | null;
  readonly actorId: string;
  readonly actorRole: string;
  readonly intent: UserIntent | null;
  readonly capability: string | null;
  readonly tool: string;
  readonly surface: string;
  readonly entityType: string | null;
  readonly entityId: string | null;
  readonly input: Readonly<Record<string, unknown>> | null;
  readonly output: unknown;
  readonly status: "running" | "success" | "failed" | "blocked";
  readonly verificationStatus: "pending" | "verified" | "failed" | "skipped";
  readonly timestamp: string;
};

export type AgentTurnObservation = {
  readonly actionId: string;
  readonly capability: string | null;
  readonly tool: string;
  readonly input: Readonly<Record<string, unknown>> | null;
  readonly output: unknown;
  readonly status: "success" | "failed" | "partial";
  readonly affectedEntities: readonly string[];
  readonly mutations: readonly string[];
  readonly errors: readonly string[];
  readonly timestamp: string;
  readonly summaryKo: string;
};

export type AgentTurnCheck = {
  readonly id: string;
  readonly labelKo: string;
  readonly group: "data" | "flow" | "management" | "testing";
  readonly passed: boolean;
  readonly evidence: string;
};

export type AgentTurnVerification = {
  readonly passed: boolean;
  readonly ran: boolean;
  readonly browserTest: "ran" | "unavailable" | "skipped";
  readonly checks: readonly AgentTurnCheck[];
  readonly failedReasons: readonly string[];
  readonly detailKo: string;
};

export type AgentTurnNextAction = {
  readonly id: string;
  readonly labelKo: string;
};

export type AgentFinalReport = {
  readonly headlineKo: string;
  readonly completed: readonly string[];
  readonly verification: readonly { readonly labelKo: string; readonly passed: boolean }[];
  readonly changed: readonly string[];
  readonly cautions: readonly string[];
  readonly nextActions: readonly AgentTurnNextAction[];
  readonly verified: boolean;
  readonly status: "success" | "partial" | "failed" | "waiting" | "paused";
};

export type AgentTurnLimits = {
  readonly maxSteps: number;
  readonly maxRetriesPerAction: number;
  readonly maxReplans: number;
  readonly executionTimeoutMs: number;
};

export type AgentTurn = {
  readonly id: string;
  readonly sessionId: string;
  readonly request: string;
  readonly status: AgentTurnStatus;
  readonly intent: AgentTurnUnderstand | null;
  readonly inspection: AgentTurnInspection | null;
  readonly planLabels: readonly string[];
  readonly steps: readonly { readonly id: string; readonly label: string; readonly status: "done" | "running" | "pending" | "failed" }[];
  readonly observations: readonly AgentTurnObservation[];
  readonly decisions: readonly AgentTurnDecision[];
  readonly actions: readonly AgentTurnActionRecord[];
  readonly stepObservations: readonly AgentObservation[];
  readonly verification: AgentTurnVerification | null;
  readonly finalResult: {
    readonly status: "success" | "partial" | "failed" | "waiting" | "paused";
    readonly ok: boolean;
  } | null;
  readonly report: AgentFinalReport | null;
  readonly stepCount: number;
  readonly replanCount: number;
  readonly retryCount: number;
  readonly paused: boolean;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly compiledGoal?: import("@/lib/agent-os/decision-engine/types").CompiledGoal | null;
  readonly decisionLevel?: import("@/lib/agent-os/decision-engine/types").DecisionLevel | null;
  readonly constraints?: readonly import("@/lib/agent-os/decision-engine/types").GoalConstraint[];
  readonly discoveredFacts?: readonly string[];
  readonly engineDecisions?: readonly import("@/lib/agent-os/decision-engine/types").DecisionContract[];
};

export const AGENT_TURN_EVENT_KINDS = [
  "AGENT_STARTED",
  "INTENT_DETECTED",
  "GOAL_CREATED",
  "STATE_INSPECTION_STARTED",
  "STATE_INSPECTION_COMPLETED",
  "CAPABILITIES_DISCOVERED",
  "INSPECTION_STARTED",
  "PLAN_CREATED",
  "ACTION_SELECTED",
  "ACTION_STARTED",
  "ACTION_COMPLETED",
  "OBSERVATION_CREATED",
  "VERIFICATION_STARTED",
  "VERIFICATION_PASSED",
  "VERIFICATION_FAILED",
  "FAILURE_CLASSIFIED",
  "ALTERNATIVES_GENERATED",
  "REPLAN_STARTED",
  "REPLAN_COMPLETED",
  "WAITING_FOR_APPROVAL",
  "AGENT_PAUSED",
  "AGENT_COMPLETED",
  "AGENT_FAILED",
  "FINAL_REPORT_CREATED",
] as const;

export type AgentTurnEventKind = (typeof AGENT_TURN_EVENT_KINDS)[number];

export type AgentTurnEvent = {
  readonly kind: AgentTurnEventKind;
  readonly atIso: string;
  readonly labelKo: string;
  readonly detail?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
};
