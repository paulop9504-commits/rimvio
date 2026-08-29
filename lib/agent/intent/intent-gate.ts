/**
 * Intent Gate — first stage of Hub Agent Controller.
 * Blocks Tool / Planner / Executor for chat & question.
 */

import { classifyIntent } from "@/lib/agent/intent/classify-intent";
import {
  CONVERSATIONAL_INTENTS,
  type AgentIntent,
  type IntentConversationContext,
  type IntentGateResult,
} from "@/lib/agent/intent/intent-types";

function conversationalResponse(intent: AgentIntent, platformName?: string | null): string {
  const name = platformName?.trim() || "Platform";
  switch (intent) {
    case "chat":
      return "안녕하세요! 무엇을 도와드릴까요? 플랫폼 수정 · 테스트 · 연결 · Publish까지 말씀해 주세요.";
    case "question":
      return `${name} Workspace에서 capability · schema · workflow · test · deploy를 직접 수정해 드릴 수 있어요. 예: "호텔 검색 추가해줘", "테스트 돌려줘", "현재 플랫폼 상태 확인해줘"`;
    default:
      return "";
  }
}

export function runIntentGate(input: {
  readonly utterance: string;
  readonly context?: IntentConversationContext;
}): IntentGateResult {
  const classified = classifyIntent(input.utterance, input.context);
  const intent = classified.intent;
  const conversational = CONVERSATIONAL_INTENTS.includes(intent);
  const executable = !conversational;

  return {
    intent,
    executable,
    conversational,
    allowTools: executable && intent !== "chat" && intent !== "question",
    allowPlanner: executable && intent !== "inspect",
    allowExecution: executable,
    responseKo: conversational ? conversationalResponse(intent, input.context?.platformName) : null,
  };
}

export { classifyIntent, isExecutableIntent } from "@/lib/agent/intent/classify-intent";
export type { AgentIntent, IntentGateResult } from "@/lib/agent/intent/intent-types";
