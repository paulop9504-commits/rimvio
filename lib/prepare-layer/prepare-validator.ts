/**
 * Prepare Validator — allow prepare drafts; forbid Reality execution.
 *
 * Impossible here:
 *  - 결제
 *  - 예약 확정
 *  - 구매 실행
 */

import type { PrepareAction } from "@/lib/prepare-layer/types";
import { PREPARE_ACTIONS } from "@/lib/prepare-layer/types";

const FORBIDDEN_OPS = new Set([
  "pay",
  "payment",
  "checkout",
  "confirm_reservation",
  "book",
  "book_now",
  "purchase",
  "purchase_execute",
  "commit",
  "reality_commit",
  "globe_commit",
  "stamp_globe",
]);

export function isPrepareExecutionForbidden(op: string): boolean {
  const key = op.trim().toLowerCase().replace(/\s+/g, "_");
  return FORBIDDEN_OPS.has(key);
}

export function looksLikeForbiddenPrepareUtterance(utterance: string): boolean {
  const t = utterance.trim();
  return (
    /결제|결제해|결제\s*진행|pay\s*now|카드\s*결제/iu.test(t) ||
    /예약\s*확정|확정\s*예약|바로\s*예약|지금\s*예약|book\s*now|confirm\s*book/iu.test(
      t,
    ) ||
    /구매\s*실행|지금\s*사|구매해\s*줘|구매\s*확정|checkout|바로\s*구매/iu.test(t) ||
    /reality\s*commit|지구에\s*남|커밋/iu.test(t)
  );
}

export function assertPrepareDoesNotExecute(op: string): void {
  if (isPrepareExecutionForbidden(op)) {
    throw new Error(
      "Prepare Layer cannot execute Reality actions — ready_for_commit only (no pay / confirm / purchase)",
    );
  }
}

export function isAllowedPrepareAction(action: string): action is PrepareAction {
  return (PREPARE_ACTIONS as readonly string[]).includes(action);
}

export function validatePrepareDraft(input: {
  readonly action: string;
  readonly entityId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly utterance?: string;
}):
  | { readonly ok: true }
  | { readonly ok: false; readonly reasonKo: string; readonly forbidden: boolean } {
  assertPrepareDoesNotExecute("prepare");

  if (input.utterance && looksLikeForbiddenPrepareUtterance(input.utterance)) {
    return {
      ok: false,
      reasonKo:
        "결제 · 예약 확정 · 구매 실행은 Prepare에서 할 수 없어요 · Field Commit만 가능",
      forbidden: true,
    };
  }

  if (!input.entityId.trim()) {
    return {
      ok: false,
      reasonKo: "Prepare 대상 entityId가 없어요",
      forbidden: false,
    };
  }

  if (!isAllowedPrepareAction(input.action)) {
    return {
      ok: false,
      reasonKo: "허용되지 않은 Prepare action이에요",
      forbidden: true,
    };
  }

  if (input.action === "reservation_prepare") {
    const guests = input.payload.guests;
    if (typeof guests === "number" && guests < 1) {
      return {
        ok: false,
        reasonKo: "인원은 1명 이상이어야 해요",
        forbidden: false,
      };
    }
  }

  return { ok: true };
}
