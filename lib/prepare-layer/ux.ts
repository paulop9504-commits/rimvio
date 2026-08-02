/**
 * Prepare Layer UX — ready_for_commit surface.
 *
 * 예약 준비 완료
 * [예약 검토]
 *
 * Commit is never offered here.
 */

import type { PrepareObject, PrepareResult } from "@/lib/prepare-layer/types";
import { PREPARE_OBJECT_STATUS } from "@/lib/prepare-layer/types";

export const PREPARE_REVIEW_CTA_KO = "예약 검토" as const;
export const PREPARE_READY_TITLE_KO = "예약 준비 완료" as const;

/**
 * UX card for Prepare success.
 *
 * 예약 준비 완료
 *
 * [예약 검토]
 */
export function formatPrepareReadyUxKo(
  prepare: Pick<PrepareObject, "status" | "summaryKo" | "titleKo" | "action">,
): string {
  const title =
    prepare.action === "reservation_prepare"
      ? PREPARE_READY_TITLE_KO
      : prepare.action === "purchase_candidate"
        ? "구매 준비 완료"
        : prepare.action === "schedule_prepare"
          ? "일정 준비 완료"
          : "준비 완료";

  return [
    title,
    "",
    prepare.summaryKo,
    `status · ${prepare.status}`,
    "",
    `[${PREPARE_REVIEW_CTA_KO}]`,
  ].join("\n");
}

export function prepareResultToUxKo(result: PrepareResult): string | null {
  if (!result.ok) return null;
  if (result.prepare.status !== PREPARE_OBJECT_STATUS) return null;
  return formatPrepareReadyUxKo(result.prepare);
}

/** Commit CTA must not appear on Prepare surface */
export function prepareSurfaceForbidsCommitCta(uxKo: string): boolean {
  return (
    !/\[승인\]|Confirm Reality|Commit\s*지금|바로\s*확정/iu.test(uxKo) &&
    uxKo.includes(`[${PREPARE_REVIEW_CTA_KO}]`)
  );
}
