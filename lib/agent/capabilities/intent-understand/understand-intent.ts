/**
 * Capability #1 — Intent Understanding (implementation).
 *
 * Canonical Hub ingress for utterance → intent classification.
 * Wraps deterministic classifier; does NOT call Planner/Tools.
 */

import { classifyIntent, isExecutableIntent } from "@/lib/agent/conversation/classify-intent";
import type { ConversationContext } from "@/lib/agent/conversation/intent-types";
import {
  CAPABILITY_ID,
  INTENT_UNDERSTAND_EVENTS,
  type IntentConstraint,
  type IntentEntity,
  type IntentUnderstandInput,
  type IntentUnderstandOutput,
  type IntentUnderstandResult,
} from "@/lib/agent/capabilities/intent-understand/contract";

function normalizeUtterance(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function extractEntities(utterance: string): IntentEntity[] {
  const entities: IntentEntity[] = [];
  const atMatches = utterance.matchAll(/@([a-z][a-z0-9_.]+)/gi);
  for (const m of atMatches) {
    entities.push({ kind: "capability", value: m[1]! });
  }
  const fileMatch = utterance.match(/([a-z0-9_./-]+\.(?:ts|tsx|js|json))\b/i);
  if (fileMatch?.[1]) {
    entities.push({ kind: "file", value: fileMatch[1] });
  }
  if (/stripe/i.test(utterance)) {
    entities.push({ kind: "provider", value: "stripe" });
  }
  if (/vercel/i.test(utterance)) {
    entities.push({ kind: "provider", value: "vercel" });
  }
  if (/github|git\s*hub|깃허브/i.test(utterance)) {
    entities.push({ kind: "provider", value: "github" });
  }
  const symMatch = utterance.match(/([a-z][a-zA-Z0-9]+)\s*함수/i);
  if (symMatch?.[1]) {
    entities.push({ kind: "symbol", value: symMatch[1] });
  }
  return entities;
}

function extractConstraints(utterance: string): IntentConstraint[] {
  const constraints: IntentConstraint[] = [];
  if (/가격순|price\s*sort/i.test(utterance)) {
    constraints.push({ kind: "sort", value: "price_asc" });
  }
  if (/승인|approval/i.test(utterance)) {
    constraints.push({ kind: "approval", value: "required" });
  }
  if (/배포|publish|production/i.test(utterance)) {
    constraints.push({ kind: "publish", value: "production" });
  }
  return constraints;
}

/**
 * Capability #1 entry point.
 * currentPlatform in context MUST NOT override utterance intent.
 */
export function understandIntent(input: IntentUnderstandInput): IntentUnderstandOutput {
  const utterance = normalizeUtterance(input.utterance);

  if (!utterance) {
    return {
      ok: false,
      error: { code: "empty_utterance", message: "Utterance is empty" },
    };
  }

  const classified = classifyIntent(utterance, input.context);
  const executable = isExecutableIntent(classified.intent);
  const entities = extractEntities(utterance);
  const constraints = extractConstraints(utterance);

  const result: IntentUnderstandResult = {
    capabilityId: CAPABILITY_ID,
    intent: classified.intent,
    confidence: classified.confidence,
    reason: classified.reason,
    executable,
    goal: executable ? utterance : null,
    entities,
    constraints,
  };

  return { ok: true, result };
}

/** Event payloads for Activity UI bridge (Cap #1 only). */
export function intentUnderstandEvents(
  output: IntentUnderstandOutput,
): readonly { readonly type: string; readonly label: string; readonly detail?: string }[] {
  if (!output.ok) {
    return [{ type: INTENT_UNDERSTAND_EVENTS.failed, label: output.error.message }];
  }
  return [
    { type: INTENT_UNDERSTAND_EVENTS.started, label: "Understanding request" },
    {
      type: INTENT_UNDERSTAND_EVENTS.detected,
      label: `Intent: ${output.result.intent}`,
      detail: `${output.result.confidence} · ${output.result.reason}`,
    },
  ];
}

/** Guard: Cap #1 result must never imply tool execution for chat/question. */
export function assertIntentPolicy(result: IntentUnderstandResult): void {
  if (result.intent === "chat" || result.intent === "question") {
    if (result.executable) {
      throw new Error("Policy violation: chat/question must not be executable");
    }
  }
}

export type { ConversationContext };
