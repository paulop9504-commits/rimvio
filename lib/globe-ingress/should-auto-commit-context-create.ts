/**
 * Clear trip Intent (destination + stay length) → auto Commit like Cursor apply.
 * Known hub / overseas-registry cities alone also auto-open Continuum.
 * Ambiguous drafts still offer 「생성」chips (Article 0 for vague creates).
 */

import type { PendingContextCreateDraft } from "@/lib/globe-ingress/pending-context-create-store";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";

const KNOWN_HUB_DEST_RE =
  /(?:오사카|도쿄|후쿠오카|교토|나고야|삿포로|제주|부산|서울|파리|뉴욕|방콕|다낭|타이베이|오키나와|하와이|괌|사이판|발리|세부|싱가포르|홍콩|런던|LA|로스앤젤레스)/iu;

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
  // 「오사카 간다」·「하와이로 간다」— clear hub / overseas city → mint Continuum.
  if (KNOWN_HUB_DEST_RE.test(destination)) {
    return true;
  }
  if (classifyOverseasManualPlace(destination)?.kind === "city") {
    return true;
  }
  return false;
}
