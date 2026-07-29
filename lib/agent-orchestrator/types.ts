/**
 * Multi-Agent Orchestration — agent registry, messaging, result merge.
 */

export type AgentCapability =
  | "search"
  | "reserve"
  | "compare"
  | "navigate"
  | "weather"
  | "payment"
  | "itinerary"
  | "general";

export type AgentRegistration = {
  readonly agentId: string;
  readonly domain: string;
  readonly capabilities: readonly AgentCapability[];
  readonly priority: number;
};

export type AgentMessage = {
  readonly from: string;
  readonly to: string;
  readonly kind: "request" | "result" | "constraint_update" | "priority_change";
  readonly payload: unknown;
  readonly timestamp: string;
};

export type AgentTaskInput = {
  readonly nodeId: string;
  readonly agentId: string;
  readonly label: string;
  readonly contextEventId: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
};

export type AgentTaskResult = {
  readonly nodeId: string;
  readonly agentId: string;
  readonly success: boolean;
  readonly result?: unknown;
  readonly errorReason?: string;
  readonly durationMs: number;
};

export type OrchestrationResult = {
  readonly planId: string;
  readonly agentResults: readonly AgentTaskResult[];
  readonly conflicts: readonly string[];
  readonly status: "completed" | "partial" | "failed";
};
