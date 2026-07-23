/**
 * While Context create draft is pending, accept date/destination corrections
 * (e.g. 「7/26~8/1」) and re-offer an updated preview — no Reality Commit.
 */

import type { ContextNlActionResult } from "@/lib/action-planner/context-nl-types";
import type { ContextPackV1 } from "@/lib/context-builder";
import type { RuleEngineDecision } from "@/lib/rule-engine/evaluate-utterance-rules";
import { buildPendingContextCreateDraft } from "@/lib/globe-ingress/build-pending-context-create-draft";
import { buildPendingContextCreatePreviewText } from "@/lib/globe-ingress/format-pending-context-create-preview";
import {
  readPendingContextCreate,
  writePendingContextCreate,
  type PendingContextCreateDraft,
} from "@/lib/globe-ingress/pending-context-create-store";
import {
  mergeTravelSlots,
  parseTravelDateRangeFromText,
  parseTravelSlotsFromMessage,
} from "@/lib/experience-run/travel-context-slots";
import { extractRunDestination } from "@/lib/experience-run/classify-experience-run-intent";
import { writeClarifyLessPending } from "@/lib/rule-engine/clarify-less-pending-store";
import { copy } from "@/lib/copy/human-ko";

function looksLikeTravelDraftCorrection(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 80) {
    return false;
  }
  const ref = new Date().toISOString().slice(0, 10);
  if (parseTravelDateRangeFromText(t, ref)) {
    return true;
  }
  if (
    /^\d{1,2}\s*[\/\.]\s*\d{1,2}\s*(?:~|-|—|–|～)\s*\d{1,2}\s*[\/\.]\s*\d{1,2}$/u.test(
      t,
    )
  ) {
    return true;
  }
  if (/\d{1,2}\s*월\s*\d{1,2}\s*일.+\d{1,2}\s*월\s*\d{1,2}\s*일/u.test(t)) {
    return true;
  }
  if (extractRunDestination(t) && t.length <= 24) {
    return true;
  }
  return false;
}

function rebuildDraftFromCorrection(input: {
  pending: PendingContextCreateDraft;
  utterance: string;
}): PendingContextCreateDraft {
  const referenceDate = new Date().toISOString().slice(0, 10);
  const patch = parseTravelSlotsFromMessage(input.utterance, referenceDate);
  const merged = mergeTravelSlots(input.pending.travelSlots, patch);

  const destination =
    merged.destination?.trim() ||
    input.pending.travelSlots.destination?.trim() ||
    null;
  const durationDays = merged.durationDays ?? null;
  const anchorTimeIso = merged.anchorTimeIso ?? null;

  const parts: string[] = [];
  if (destination) {
    parts.push(`${destination}으로 놀러감`);
  }
  if (anchorTimeIso && durationDays) {
    const start = new Date(anchorTimeIso);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(0, durationDays - 1));
    parts.push(
      `${start.getMonth() + 1}월${start.getDate()}일부터 ${end.getMonth() + 1}월${end.getDate()}일까지`,
    );
  } else if (input.utterance.trim()) {
    parts.push(input.utterance.trim());
  } else {
    parts.push(input.pending.utterance);
  }
  parts.push("여행 계획세워");

  return buildPendingContextCreateDraft({
    graphId: input.pending.graphId,
    utterance: parts.join(" "),
    compiled: input.pending.compiled,
    referenceDate,
    profile: input.pending.profile,
  });
}

export function tryPatchPendingContextCreate(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly ruleDecision: RuleEngineDecision;
  readonly pack: ContextPackV1;
}): Extract<ContextNlActionResult, { via: "clarify" }> | null {
  const utterance = input.utterance.trim();
  const contextEventId = input.contextEventId.trim();
  if (!utterance || !contextEventId) {
    return null;
  }
  const pending = readPendingContextCreate(contextEventId);
  if (!pending || !looksLikeTravelDraftCorrection(utterance)) {
    return null;
  }

  const draft = rebuildDraftFromCorrection({ pending, utterance });
  writePendingContextCreate(draft);
  const preview = buildPendingContextCreatePreviewText(draft);
  const chips = [
    {
      id: "context_create_yes",
      labelKo: copy.globe.contextAnchor.createCta,
      gapId: "create",
      value: "만들어",
    },
    {
      id: "context_create_no",
      labelKo: copy.globe.contextAnchor.cancelCta,
      gapId: "cancel",
      value: "취소",
    },
  ] as const;

  writeClarifyLessPending(contextEventId, {
    originalUtterance: draft.utterance,
    intentLabelKo: "Create",
    candidateIds: chips.map((c) => c.value),
    atIso: new Date().toISOString(),
  });

  return {
    ok: true,
    via: "clarify",
    contextEventId,
    assistantReplyKo: `${preview}\n${copy.globe.contextAnchor.chipPrompt}`,
    reservedOpIds: [],
    waitingCommit: false,
    ruleDecision: input.ruleDecision,
    contextPack: input.pack,
    clarifyChips: chips,
  };
}
