/**
 * Create Intent — 「맥락 만들어」→ pending Context draft + chips (no Commit).
 */

import type { ContextNlActionResult } from "@/lib/action-planner/context-nl-types";
import { buildPendingContextCreateDraft } from "@/lib/globe-ingress/build-pending-context-create-draft";
import { buildPendingContextCreatePreviewText } from "@/lib/globe-ingress/format-pending-context-create-preview";
import { compileGlobeIngress } from "@/lib/globe-ingress/compile-globe-ingress";
import { writePendingContextCreate } from "@/lib/globe-ingress/pending-context-create-store";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import { writeClarifyLessPending } from "@/lib/rule-engine/clarify-less-pending-store";
import type { ContextPackV1 } from "@/lib/context-builder";
import type { RuleEngineDecision } from "@/lib/rule-engine/evaluate-utterance-rules";

export function isCreateContextUtterance(text: string): boolean {
  const t = text.trim();
  if (!t) {
    return false;
  }
  if (classifyIntentFamily(t) !== "Create" && !/만들|생성|create/iu.test(t)) {
    return false;
  }
  return /(?:맥락|컨텍스트|여행|context|프로젝트|project)\s*(?:을\s*)?(?:만들|생성)|(?:만들|생성).*(?:맥락|여행|컨텍스트|프로젝트)|맥락\s*만들어|(?:새\s*)?프로젝트\s*(?:만들|생성)|[가-힣A-Za-z]{2,16}\s*여행\s*(?:만들|생성)/iu.test(
    t,
  );
}

export function tryRunNlContextCreateOffer(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly ruleDecision: RuleEngineDecision;
  readonly pack: ContextPackV1;
}): Extract<ContextNlActionResult, { via: "clarify" }> | null {
  const utterance = input.utterance.trim();
  const contextEventId = input.contextEventId.trim();
  if (!utterance || !contextEventId || !isCreateContextUtterance(utterance)) {
    return null;
  }

  const compiled = compileGlobeIngress({
    text: utterance,
    existingContextId: contextEventId,
  });
  const draft = buildPendingContextCreateDraft({
    graphId: contextEventId,
    utterance,
    compiled,
  });
  writePendingContextCreate(draft);
  const preview = buildPendingContextCreatePreviewText(draft);
  const chips = [
    {
      id: "context_create_yes",
      labelKo: "만들어",
      gapId: "create",
      value: "만들어",
    },
    {
      id: "context_create_no",
      labelKo: "나중에",
      gapId: "cancel",
      value: "취소",
    },
  ] as const;

  writeClarifyLessPending(contextEventId, {
    originalUtterance: utterance,
    intentLabelKo: "Create",
    candidateIds: chips.map((c) => c.value),
    atIso: new Date().toISOString(),
  });

  return {
    ok: true,
    via: "clarify",
    contextEventId,
    assistantReplyKo: `${preview}\n만들까요?`,
    reservedOpIds: [],
    waitingCommit: false,
    ruleDecision: input.ruleDecision,
    contextPack: input.pack,
    clarifyChips: chips,
  };
}
