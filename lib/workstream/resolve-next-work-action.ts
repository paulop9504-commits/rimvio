/**
 * Resolve “계속해” → next Action utterance from Context Work State.
 */

import { classifyActionVerb } from "@/lib/rimvio-command/action-verb";
import { isExplicitContextContinue } from "@/lib/context-run/should-spawn-new-context";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import {
  readOrBuildContextWorkState,
} from "@/lib/workstream/sync-context-work-state";
import type { ContextWorkState } from "@/lib/workstream/context-work-state";
import type { ContextWorkNextAction } from "@/lib/workstream/context-work-state";
import { stampTripDraftOntoContext } from "@/lib/context-workspace/stamp-trip-draft-onto-context";

export function isContinueWorkUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  if (isExplicitContextContinue(text)) return true;
  if (classifyActionVerb(text) === "resume") return true;
  return /^(?:계속(?:해|해줘| 진행)?|이어서|다음|진행)$/iu.test(text);
}

export type NextWorkActionResult = {
  readonly work: ContextWorkState;
  readonly action: ContextWorkNextAction | null;
  readonly enqueueUtterance: string | null;
  readonly replyKo: string;
};

const SOFT_PRIORITY = [
  "search_hotel",
  "search_eatery",
  "optimize_route",
] as const;

function softActionFromPending(
  pending: readonly string[],
): ContextWorkNextAction | null {
  const actions: ContextWorkNextAction[] = [];
  if (pending.includes("lodging")) {
    actions.push({
      id: "search_hotel",
      labelKo: "숙소 찾기",
      enqueueUtterance: "숙소 찾아줘",
      slotId: "lodging",
    });
  }
  if (pending.includes("food")) {
    actions.push({
      id: "search_eatery",
      labelKo: "맛집 선택",
      enqueueUtterance: "맛집 찾아줘",
      slotId: "food",
    });
  }
  if (pending.includes("route")) {
    actions.push({
      id: "optimize_route",
      labelKo: "일정 최적화",
      enqueueUtterance: "동선 최적화해줘",
      slotId: "route",
    });
  }
  for (const id of SOFT_PRIORITY) {
    const hit = actions.find((a) => a.id === id);
    if (hit) return hit;
  }
  return null;
}

/** Apply Reality Draft dest/dates when Continue would otherwise enqueue dead quiz. */
function healTripDraftSlots(contextEventId: string): void {
  const draft = readContextWorkspace(contextEventId);
  const dest =
    draft?.realityDraft?.destinationKo?.trim() ||
    draft?.query.replace(/\s*여행.*$/u, "").trim() ||
    null;
  if (!dest || dest === "여행지") return;
  const stay =
    draft?.realityDraft?.stayLabelKo?.trim() ||
    (/\d+\s*박/.test(draft?.query ?? "")
      ? (/\d+\s*박(?:\s*\d+\s*일)?/u.exec(draft?.query ?? "")?.[0] ?? null)
      : null);
  stampTripDraftOntoContext({
    contextEventId,
    destinationKo: dest,
    stayLabelKo: stay,
  });
}

export function resolveNextWorkAction(input: {
  readonly contextEventId: string;
  readonly utterance?: string | null;
}): NextWorkActionResult {
  const contextEventId = input.contextEventId.trim();
  let event = findLifeEventCandidate(contextEventId);
  let work = readOrBuildContextWorkState({
    contextEventId,
    event,
  });

  // Prefer soft scout over destination/dates quiz chips.
  let action = softActionFromPending(work.pending);
  if (!action) {
    const head = work.nextActions[0] ?? null;
    if (
      head &&
      (head.id === "set_destination" || head.id === "set_dates")
    ) {
      healTripDraftSlots(contextEventId);
      event = findLifeEventCandidate(contextEventId);
      work = readOrBuildContextWorkState({ contextEventId, event });
      action = softActionFromPending(work.pending) ?? work.nextActions[0] ?? null;
    } else {
      action = head;
    }
  }

  if (!action) {
    return {
      work,
      action: null,
      enqueueUtterance: null,
      replyKo:
        work.percent >= 100
          ? "핵심 칸은 채워졌어요. 결재함에서 확정하거나 더 말해 주세요."
          : "지금 바로 이을 다음 작업이 없어요. 숙소·맛집·동선 중 말해 주세요.",
    };
  }
  return {
    work,
    action,
    enqueueUtterance: action.enqueueUtterance,
    replyKo: `이어서 「${action.labelKo}」를 진행할게요.`,
  };
}
