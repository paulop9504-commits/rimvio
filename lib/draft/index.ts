/**
 * Reality Draft Engine — Draft + Reality Diff
 *
 * AI proposes Draft only. Human Apply → approved.
 * Never mutates Global Reality on create.
 */

export type { DraftImpact } from "@/lib/draft/impact";
export { computeDraftImpact, formatImpactUxKo } from "@/lib/draft/impact";

export type {
  DraftSnapshot,
  RealityDraftDiff,
} from "@/lib/draft/diff";
export {
  buildDraftDiff,
  buildDraftDiffFromIntent,
  formatDraftDiffGitStyleKo,
  formatDraftDiffUxKo,
  formatRealityDiffGitStyleKo,
} from "@/lib/draft/diff";

export type {
  CreateDraftInput,
  DraftApplyResult,
  RealityDraft,
  RealityDraftStatus,
} from "@/lib/draft/draft";

export {
  REALITY_DRAFT_STATUSES,
  approveDraft,
  assertAiDoesNotMutateReality,
  clearDraftsForTests,
  createDraft,
  createDraftFromIntent,
  formatDraftUxCardKo,
  listDrafts,
  readDraft,
  rejectDraft,
} from "@/lib/draft/draft";
