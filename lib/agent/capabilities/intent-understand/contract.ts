/**
 * Capability #1 — Intent Understanding
 * Contract types (SSOT).
 *
 * Input:  ConversationContext + utterance
 * Output: IntentUnderstandResult
 * Policy: No Tool / Planner / Executor calls inside this capability.
 */

import type { ConversationContext, UserIntent } from "@/lib/agent/conversation/intent-types";

export const CAPABILITY_ID = "intent.understand" as const;
export const CAPABILITY_NUMBER = 1 as const;

export type IntentConfidence = "high" | "medium" | "low";

/** Extracted entity hints (full resolution = Cap #5). */
export type IntentEntity = {
  readonly kind: "capability" | "provider" | "file" | "symbol" | "platform";
  readonly value: string;
};

/** Constraint hints (full extraction = Cap #6). */
export type IntentConstraint = {
  readonly kind: "sort" | "approval" | "connection" | "publish" | "other";
  readonly value: string;
};

export type IntentUnderstandInput = {
  readonly utterance: string;
  readonly context?: ConversationContext;
};

export type IntentUnderstandResult = {
  readonly capabilityId: typeof CAPABILITY_ID;
  readonly intent: UserIntent;
  readonly confidence: IntentConfidence;
  readonly reason: string;
  /** Whether downstream Agent Loop may start (false for chat/question). */
  readonly executable: boolean;
  readonly goal: string | null;
  readonly entities: readonly IntentEntity[];
  readonly constraints: readonly IntentConstraint[];
};

export type IntentUnderstandError = {
  readonly code: "empty_utterance" | "invalid_input";
  readonly message: string;
};

export type IntentUnderstandOutput =
  | { readonly ok: true; readonly result: IntentUnderstandResult }
  | { readonly ok: false; readonly error: IntentUnderstandError };

/** Agent events emitted by Cap #1 (wire to Activity UI). */
export const INTENT_UNDERSTAND_EVENTS = {
  started: "agent.intent_understand.started",
  detected: "agent.intent_detected",
  failed: "agent.intent_understand.failed",
} as const;
