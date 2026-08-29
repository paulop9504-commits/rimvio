/**
 * Conversation Gate — intent vocabulary (P0/P1).
 * currentPlatform is context only; never an execution trigger.
 */

import type { PlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";

export type UserIntent =
  | "chat"
  | "question"
  | "inspect"
  | "create"
  | "modify"
  | "test"
  | "connect"
  | "publish";

/** @deprecated alias — prefer UserIntent */
export type AgentIntent = UserIntent;

export const CONVERSATIONAL_INTENTS: readonly UserIntent[] = ["chat", "question"];

export const EXECUTABLE_INTENTS: readonly UserIntent[] = [
  "inspect",
  "create",
  "modify",
  "test",
  "connect",
  "publish",
];

export type ClassifiedIntent = {
  readonly intent: UserIntent;
  readonly confidence: "high" | "medium" | "low";
  readonly reason: string;
};

/** Workspace context — must NOT override current utterance intent. */
export type ConversationContext = {
  readonly history?: readonly string[];
  readonly currentPlatform?: string | null;
  readonly currentObject?: string | null;
  readonly currentTask?: string | null;
  readonly currentGoal?: string | null;
  readonly currentIntent?: UserIntent | null;
  /** @deprecated use currentGoal */
  readonly staleGoal?: string | null;
  readonly platformName?: string | null;
};

export type GoalResolution = {
  readonly ready: boolean;
  readonly goal: string | null;
  readonly clarificationKo: string | null;
};

export type ConversationGateResult = {
  readonly intent: UserIntent;
  readonly executable: boolean;
  readonly conversational: boolean;
  readonly needsClarification: boolean;
  readonly allowTools: boolean;
  readonly allowPlanner: boolean;
  readonly allowExecution: boolean;
  readonly responseKo: string | null;
  readonly currentGoal: string | null;
  readonly platformGoal?: PlatformGoal | null;
};

/** @deprecated alias */
export type IntentGateResult = ConversationGateResult;
/** @deprecated alias */
export type IntentConversationContext = ConversationContext;
