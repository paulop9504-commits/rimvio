/**
 * Reality Commit Engine gate — only human-approved Field path may mutate Reality.
 * Graph/Agent/Search may prepare; they must not call this without approval.
 */

export const REALITY_COMMIT_POLICY = {
  /** Prepare ops (Inbox) are allowed without Commit. */
  allowPrepareWithoutCommit: true,
  /** Auto booking/payment/delete-from-reality is forbidden. */
  forbidAutoRealityMutation: true,
} as const;

export type RealityCommitRequest = {
  readonly contextEventId: string;
  readonly operationIds: readonly string[];
  readonly approvedByHuman: boolean;
};

export type RealityCommitGateResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reasonKo: string };

/**
 * Gate before any Reality-side effect (booking confirm, calendar write, payment).
 */
export function assertHumanRealityCommit(
  request: RealityCommitRequest,
): RealityCommitGateResult {
  if (!request.approvedByHuman) {
    return {
      allowed: false,
      reasonKo: "결재함에서 승인한 뒤에만 반영할 수 있어요",
    };
  }
  if (!request.contextEventId.trim()) {
    return {
      allowed: false,
      reasonKo: "맥락이 없어 반영할 수 없어요",
    };
  }
  if (request.operationIds.length === 0) {
    return {
      allowed: false,
      reasonKo: "반영할 준비가 없어요",
    };
  }
  return { allowed: true };
}

export function isPrepareOnlyMutation(kind: "prepare" | "commit"): boolean {
  return kind === "prepare";
}
