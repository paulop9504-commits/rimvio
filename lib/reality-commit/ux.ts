/**
 * Reality Commit UX — Human Controlled Commit.
 *
 * Confirm Reality Change
 * [승인]
 *
 * actor must be user. AI never sees Commit as auto-action.
 */

import { REALITY_COMMIT_ACTOR } from "@/lib/reality-commit/types";
import type { RealityCommitResult } from "@/lib/reality-commit/types";

export const COMMIT_CONFIRM_TITLE_KO = "Confirm Reality Change" as const;
export const COMMIT_APPROVE_CTA_KO = "승인" as const;

/**
 * Pre-approval review card (Field).
 *
 * Confirm Reality Change
 *
 * [승인]
 */
export function formatCommitConfirmUxKo(input?: {
  readonly summaryKo?: string | null;
  readonly prepareTitleKo?: string | null;
}): string {
  return [
    COMMIT_CONFIRM_TITLE_KO,
    input?.prepareTitleKo ? input.prepareTitleKo : null,
    input?.summaryKo ?? null,
    `actor · ${REALITY_COMMIT_ACTOR}`,
    "",
    `[${COMMIT_APPROVE_CTA_KO}]`,
  ]
    .filter((l) => l != null && l !== "")
    .join("\n");
}

export function formatCommitSuccessUxKo(result: RealityCommitResult): string {
  if (!result.ok) {
    return [`Commit 실패`, result.reasonKo].join("\n");
  }
  return [
    COMMIT_CONFIRM_TITLE_KO,
    "승인됨",
    result.summaryKo,
    `Ledger · ${result.ledgerEntry.entryId}`,
    `actor · ${result.transaction.actor}`,
  ].join("\n");
}
