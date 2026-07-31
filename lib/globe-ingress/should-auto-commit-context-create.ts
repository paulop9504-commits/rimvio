/**
 * Clear trip Intent (destination + stay length) → auto Commit like Cursor apply.
 * Ambiguous drafts still offer 「생성」chips (Article 0 for vague creates).
 */

import type { PendingContextCreateDraft } from "@/lib/globe-ingress/pending-context-create-store";

export function shouldAutoCommitContextCreate(
  draft: PendingContextCreateDraft,
): boolean {
  const destination =
    draft.travelSlots?.destination?.trim() ||
    draft.anchorLabelKo?.replace(/\(임시\)$/u, "").trim() ||
    "";
  if (!destination || destination === "여행지") {
    return false;
  }
  const days = draft.travelSlots?.durationDays;
  if (typeof days === "number" && days > 0) {
    return true;
  }
  if (draft.durationLabelKo?.trim()) {
    return true;
  }
  if (draft.dateLabelKo?.trim()) {
    return true;
  }
  return false;
}
