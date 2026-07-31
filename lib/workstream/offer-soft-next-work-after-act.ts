/**
 * Soft next-gap after Act — Cursor-like one-way continue (no ask_chips quiz).
 * After search/open/select: enqueue next soft scout once; Field Commit stays human.
 */

import { findLifeEventCandidate } from "@/lib/life-read-model";
import { requestOperatorAutoRun } from "@/lib/globe/operator-turn/operator-auto-run-bridge";
import { resolveNextWorkAction } from "@/lib/workstream/resolve-next-work-action";
import { syncContextWorkState } from "@/lib/workstream/sync-context-work-state";
import type { ContextWorkNextAction } from "@/lib/workstream/context-work-state";

/**
 * Soft domain scouts only — never dates/flight chips or Field Commit.
 * Trip spine order: lodging → food → route (same-domain filtered by last utterance).
 */
const SOFT_AUTO_PRIORITY = [
  "search_hotel",
  "search_eatery",
  "optimize_route",
] as const;

const lastEnqueueByContext = new Map<string, string>();

export type SoftNextWorkOffer = {
  readonly continued: boolean;
  readonly replyKo: string | null;
  readonly enqueueUtterance: string | null;
  readonly action: ContextWorkNextAction | null;
};

function normalizeUtterance(text: string | null | undefined): string {
  return (text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, "");
}

/** Soft actions from full pending — not truncated behind destination/dates chips. */
function softActionsFromPending(
  pending: readonly string[],
): ContextWorkNextAction[] {
  const out: ContextWorkNextAction[] = [];
  if (pending.includes("lodging")) {
    out.push({
      id: "search_hotel",
      labelKo: "숙소 찾기",
      enqueueUtterance: "숙소 찾아줘",
      slotId: "lodging",
    });
  }
  if (pending.includes("food")) {
    out.push({
      id: "search_eatery",
      labelKo: "맛집 선택",
      enqueueUtterance: "맛집 찾아줘",
      slotId: "food",
    });
  }
  if (pending.includes("route")) {
    out.push({
      id: "optimize_route",
      labelKo: "일정 최적화",
      enqueueUtterance: "동선 최적화해줘",
      slotId: "route",
    });
  }
  return out;
}

function pickSoftAutoAction(
  actions: readonly ContextWorkNextAction[],
): ContextWorkNextAction | null {
  for (const id of SOFT_AUTO_PRIORITY) {
    const hit = actions.find((a) => a.id === id);
    if (hit) return hit;
  }
  return null;
}

/**
 * After a successful soft Act, sync Work State and auto-run the next soft gap once.
 */
export function offerSoftNextWorkAfterAct(input: {
  readonly contextEventId: string;
  readonly lastAct: "search" | "open_workspace" | "select";
  readonly lastUtterance?: string | null;
  /** Prefer delaying auto-run so Workspace paint lands first. */
  readonly delayMs?: number;
  readonly autoRun?: boolean;
}): SoftNextWorkOffer {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return {
      continued: false,
      replyKo: null,
      enqueueUtterance: null,
      action: null,
    };
  }

  const event = findLifeEventCandidate(contextEventId);
  const work = syncContextWorkState({ contextEventId, event });
  // Full pending → soft actions (do not truncate behind destination/dates chips).
  let candidates = softActionsFromPending(work.pending);

  // Same-domain re-scout is not "next" — skip to a different soft gap.
  const lastU = input.lastUtterance ?? "";
  if (/호텔|숙소|hotel|lodging/iu.test(lastU)) {
    candidates = candidates.filter((a) => a.id !== "search_hotel");
  }
  if (/맛집|식당|카페|eatery|food|restaurant/iu.test(lastU)) {
    candidates = candidates.filter((a) => a.id !== "search_eatery");
  }
  if (/동선|최적화|route/iu.test(lastU)) {
    candidates = candidates.filter((a) => a.id !== "optimize_route");
  }

  const action = pickSoftAutoAction(candidates);
  const resolved = resolveNextWorkAction({ contextEventId });

  if (!action?.enqueueUtterance) {
    return {
      continued: false,
      replyKo: null,
      enqueueUtterance: resolved.enqueueUtterance,
      action: resolved.action,
    };
  }

  const enqueue = action.enqueueUtterance.trim();
  const last = normalizeUtterance(input.lastUtterance);
  if (last && last === normalizeUtterance(enqueue)) {
    return {
      continued: false,
      replyKo: null,
      enqueueUtterance: enqueue,
      action,
    };
  }

  if (lastEnqueueByContext.get(contextEventId) === enqueue) {
    return {
      continued: false,
      replyKo: `다음은 「${action.labelKo}」예요 · 작업장에서 확인하거나 이어서 말해 주세요`,
      enqueueUtterance: enqueue,
      action,
    };
  }

  lastEnqueueByContext.set(contextEventId, enqueue);

  const progressKo = `이어서 「${action.labelKo}」`;
  const replyKo = `${progressKo}를 진행할게요.`;

  if (input.autoRun !== false && typeof window !== "undefined") {
    const delayMs =
      typeof input.delayMs === "number" && Number.isFinite(input.delayMs)
        ? Math.max(0, Math.round(input.delayMs))
        : 320;
    window.setTimeout(() => {
      requestOperatorAutoRun({
        contextEventId,
        text: enqueue,
        source: "soft_next_gap",
        progressKo,
        expressReady: true,
      });
    }, delayMs);
  }

  return {
    continued: true,
    replyKo,
    enqueueUtterance: enqueue,
    action,
  };
}

/** Test / reset helper. */
export function clearSoftNextWorkContinueMemory(
  contextEventId?: string,
): void {
  const id = contextEventId?.trim();
  if (!id) {
    lastEnqueueByContext.clear();
    return;
  }
  lastEnqueueByContext.delete(id);
}
