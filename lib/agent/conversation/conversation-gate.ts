/**
 * Conversation Gate — first stage before Agent Controller (P0/P1).
 * Chat/Question never reach Planner / Executor / Tool Gateway.
 */

import { classifyIntent, isExecutableIntent } from "@/lib/agent/conversation/classify-intent";
import { understandIntent } from "@/lib/agent/capabilities/intent-understand";
import { resolveGoal } from "@/lib/agent/conversation/goal-resolution";
import { resolveConversationalResponse } from "@/lib/agent/conversation/resolve-conversational-response";
import { compilePlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import {
  CONVERSATIONAL_INTENTS,
  type ConversationContext,
  type ConversationGateResult,
  type UserIntent,
} from "@/lib/agent/conversation/intent-types";

/**
 * Single ingress gate: Intent → Goal Resolution → allow/deny execution.
 * Never inspects workspace because currentPlatform exists.
 */
export function runConversationGate(input: {
  readonly utterance: string;
  readonly context?: ConversationContext;
}): ConversationGateResult {
  const cap = understandIntent({ utterance: input.utterance, context: input.context });
  if (!cap.ok) {
    return {
      intent: "chat",
      executable: false,
      conversational: true,
      needsClarification: false,
      allowTools: false,
      allowPlanner: false,
      allowExecution: false,
      responseKo: resolveConversationalResponse({
        utterance: input.utterance,
        intent: "chat",
        context: input.context,
      }).responseKo,
      currentGoal: null,
    };
  }

  const { intent, executable: capExecutable } = cap.result;
  const conversational = CONVERSATIONAL_INTENTS.includes(intent);

  if (conversational) {
    const resolved = resolveConversationalResponse({
      utterance: input.utterance,
      intent,
      context: input.context,
    });
    return {
      intent,
      executable: false,
      conversational: true,
      needsClarification: false,
      allowTools: false,
      allowPlanner: false,
      allowExecution: false,
      responseKo: resolved.responseKo,
      suggestedActions: resolved.suggestedActions,
      currentGoal: null,
    };
  }

  const platformGoal = compilePlatformGoal({
    utterance: input.utterance,
    intent,
    platformName: input.context?.platformName ?? input.context?.currentPlatform,
  });

  const goalResolution = resolveGoal(intent, input.utterance);

  if (!platformGoal.ready && platformGoal.clarificationKo) {
    return {
      intent,
      executable: false,
      conversational: true,
      needsClarification: true,
      allowTools: false,
      allowPlanner: false,
      allowExecution: false,
      responseKo: platformGoal.clarificationKo,
      currentGoal: null,
      platformGoal,
    };
  }

  if (!goalResolution.ready && goalResolution.clarificationKo) {
    return {
      intent,
      executable: false,
      conversational: true,
      needsClarification: true,
      allowTools: false,
      allowPlanner: false,
      allowExecution: false,
      responseKo: goalResolution.clarificationKo,
      currentGoal: null,
      platformGoal,
    };
  }

  const executable = capExecutable && isExecutableIntent(intent);

  return {
    intent,
    executable,
    conversational: false,
    needsClarification: false,
    allowTools: executable,
    allowPlanner: executable && intent !== "inspect",
    allowExecution: executable,
    responseKo: null,
    currentGoal: platformGoal.summaryKo,
    platformGoal,
  };
}

/** @deprecated — use runConversationGate */
export const runIntentGate = runConversationGate;

export { classifyIntent, isExecutableIntent } from "@/lib/agent/conversation/classify-intent";
export { resolveGoal } from "@/lib/agent/conversation/goal-resolution";
export { compilePlatformGoal, executionModeFromGoal, summarizePlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
export type {
  AgentIntent,
  ConversationContext,
  ConversationGateResult,
  IntentConversationContext,
  IntentGateResult,
  UserIntent,
} from "@/lib/agent/conversation/intent-types";
