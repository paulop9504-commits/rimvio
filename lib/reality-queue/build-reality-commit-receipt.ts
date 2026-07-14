import type { RealityQueueItemV1 } from "@/lib/reality-queue/types";
import type { RealityCommitReceiptV1 } from "@/lib/reality-queue/reality-commit-receipt-store";

export function buildRealityCommitReceipt(input: {
  items: readonly RealityQueueItemV1[];
  approvedPlanCount: number;
  contextEventIds: readonly string[];
  titleKo: string;
  disclaimerKo: string;
  now?: Date;
}): RealityCommitReceiptV1 {
  const lines = input.items
    .map((item) => item.labelKo.trim())
    .filter(Boolean)
    .slice(0, 3);

  const contextEventId =
    input.contextEventIds.find((id) => id.trim())?.trim() ??
    input.items.find((item) => item.contextEventId?.trim())?.contextEventId?.trim() ??
    null;

  return {
    version: 1,
    titleKo: input.titleKo,
    lines:
      lines.length > 0
        ? lines
        : input.approvedPlanCount > 0
          ? [`단계 ${input.approvedPlanCount}건 반영`]
          : [],
    disclaimerKo: input.disclaimerKo.trim() || null,
    contextEventId,
    approvedPlanCount: input.approvedPlanCount,
    committedAtIso: (input.now ?? new Date()).toISOString(),
  };
}
