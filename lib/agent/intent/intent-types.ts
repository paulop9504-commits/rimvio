/**
 * Hub Agent Intent — classifies user utterance before any Tool/Planner/Executor runs.
 */

export type AgentIntent =
  | "chat"
  | "question"
  | "inspect"
  | "create"
  | "modify"
  | "test"
  | "connect"
  | "publish";

export const CONVERSATIONAL_INTENTS: readonly AgentIntent[] = ["chat", "question"];

export const EXECUTABLE_INTENTS: readonly AgentIntent[] = [
  "inspect",
  "create",
  "modify",
  "test",
  "connect",
  "publish",
];

export type IntentConversationContext = {
  /** Prior goal/plan from workspace — must NOT override current utterance. */
  readonly staleGoal?: string | null;
  readonly platformName?: string | null;
};

export type ClassifiedIntent = {
  readonly intent: AgentIntent;
  readonly confidence: "high" | "medium";
  readonly reason: string;
};

export type IntentGateResult = {
  readonly intent: AgentIntent;
  readonly executable: boolean;
  readonly conversational: boolean;
  readonly allowTools: boolean;
  readonly allowPlanner: boolean;
  readonly allowExecution: boolean;
  readonly responseKo: string | null;
};
