/**
 * Payment prep — Field queue only (never Reality Commit).
 * Purchase Intent → payment_prep Diff.
 */

import { syncRealityPipelineAfterOperationChange } from "@/lib/reality-pipeline";
import { upsertPreparedRealityOperation } from "@/lib/reality-queue/prepared-operations-store";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

export type PaymentPrepEnqueueInput = {
  readonly contextEventId: string;
  readonly contextLabelKo?: string | null;
  readonly placeId: string;
  readonly placeName: string;
  readonly amountLabel?: string | null;
};

export function enqueuePaymentPrepOperation(
  input: PaymentPrepEnqueueInput,
): RealityOperationV1 {
  const operationId = `op:payment:${input.contextEventId}:${Date.now().toString(36)}`;
  const amount = input.amountLabel?.trim() || null;
  const op: RealityOperationV1 = {
    operationId,
    type: "payment_prep",
    domain: "finance",
    status: "pending",
    contextEventId: input.contextEventId.trim(),
    contextLabelKo: input.contextLabelKo?.trim() || null,
    labelKo: `${input.placeName} 결제 준비`,
    createdBy: "ai_assistant",
    preview: {
      titleKo: "결제 준비",
      summaryKo: amount
        ? `${input.placeName} · ${amount}`
        : `${input.placeName} · 금액 확인 후 승인`,
      diffFromKo: "결제 없음",
      diffToKo: amount ? `${amount} 결제 준비` : "결제 준비",
      placeLabelKo: input.placeName,
      providerLabelKo: "결제 수단 · 승인 시 vault 확인",
      amountLabel: amount,
      confidencePct: 70,
    },
    needApproval: true,
    dependsOnItemIds: [],
    dependencyNoteKo: "결재함에서 확인하면 결제 단계로 가요",
    undoAllowed: true,
    expiresAtIso: new Date(Date.now() + 30 * 60_000).toISOString(),
    sourceRef: input.placeId,
    engineId: "finance_prep",
    kind: "finance",
    amountLabel: amount,
    detailKo: "그래프 명령 · 결제 준비 (아직 실행 안 함)",
  };
  upsertPreparedRealityOperation(op);
  syncRealityPipelineAfterOperationChange({
    contextEventId: input.contextEventId.trim(),
    utterance: `${input.placeName} 결제 준비`,
    contextLabelKo: input.contextLabelKo,
  });
  return op;
}
