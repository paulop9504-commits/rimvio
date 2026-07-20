/**
 * Seed travel Prepare Operations into Execution Inbox / Reality Queue (no L5 Commit).
 * Pipeline: Project → flight/hotel/eatery/rental scout → compare → inbox checklist.
 */

import {
  domainFolderLabelKo,
  queueKindToDomain,
  queueKindToOperationType,
} from "@/lib/reality-queue/operation-taxonomy";
import { upsertPreparedRealityOperations } from "@/lib/reality-queue/prepared-operations-store";
import type { RealityOperationV1, RealityQueueItemKind } from "@/lib/reality-queue/types";

export type TravelPrepareSeedInput = {
  contextEventId: string;
  contextLabelKo: string;
  destinationLabelKo: string;
  /** Offer hold window — default 15 minutes. */
  holdMinutes?: number;
  /** Carrier label for flight prep — default 대한항공. */
  carrierLabelKo?: string | null;
};

function expiresInMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function buildOp(input: {
  contextEventId: string;
  contextLabelKo: string;
  kind: RealityQueueItemKind;
  operationId: string;
  labelKo: string;
  preview: RealityOperationV1["preview"];
  dependencyNoteKo?: string | null;
  dependsOnItemIds?: readonly string[];
  amountLabel?: string | null;
  engineId?: string | null;
  holdMinutes: number;
  status?: RealityOperationV1["status"];
}): RealityOperationV1 {
  const domain = queueKindToDomain(input.kind);
  return {
    operationId: input.operationId,
    type: queueKindToOperationType(input.kind),
    domain,
    status: input.status ?? "pending",
    contextEventId: input.contextEventId,
    contextLabelKo: input.contextLabelKo,
    labelKo: input.labelKo,
    createdBy: "ai_assistant",
    preview: input.preview,
    needApproval: true,
    dependsOnItemIds: input.dependsOnItemIds ?? [],
    dependencyNoteKo: input.dependencyNoteKo ?? null,
    undoAllowed: true,
    expiresAtIso: expiresInMinutes(input.holdMinutes),
    sourceRef: input.operationId,
    engineId: input.engineId ?? null,
    kind: input.kind,
    amountLabel: input.amountLabel ?? input.preview.amountLabel ?? null,
    detailKo: input.contextLabelKo,
  };
}

/**
 * Enqueue classic travel prepare pack into Execution Inbox (결재함).
 * Returns operations (also written to session store).
 */
export function enqueueTravelPrepareOperations(
  input: TravelPrepareSeedInput,
): readonly RealityOperationV1[] {
  const holdMinutes = input.holdMinutes ?? 15;
  const ctx = input.contextEventId.trim();
  const dest = input.destinationLabelKo.trim() || "여행지";
  const folder = input.contextLabelKo.trim() || `${dest} 여행`;
  const carrier = input.carrierLabelKo?.trim() || "대한항공";
  const prefix = `op:${ctx}:`;

  const lodgingId = `${prefix}lodging`;
  const flightId = `${prefix}flight`;
  const eateryId = `${prefix}eatery`;
  const rentalId = `${prefix}rental`;
  const itineraryId = `${prefix}itinerary`;
  const financeId = `${prefix}finance`;
  const cancelId = `${prefix}cancel-policy`;
  const conflictId = `${prefix}schedule-ok`;
  const reviewId = `${prefix}ai-review`;

  const ops: RealityOperationV1[] = [
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "flight",
      operationId: flightId,
      labelKo: `${carrier} 예약 준비`,
      engineId: "flight_booking",
      holdMinutes,
      amountLabel: "480,000원",
      preview: {
        titleKo: `${carrier} 예약 준비`,
        summaryKo: `${dest} 왕복 후보를 비교해 두었어요`,
        diffFromKo: "항공권 없음",
        diffToKo: `${carrier} · ${dest} 예약 초안 추가`,
        providerLabelKo: carrier,
        amountLabel: "480,000원",
        cancelPolicyKo: "출발 24시간 전 무료 취소",
        confidencePct: 88,
      },
    }),
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "lodging",
      operationId: lodgingId,
      labelKo: "호텔 예약 준비",
      engineId: "lodging_search",
      holdMinutes,
      amountLabel: "320,000원",
      preview: {
        titleKo: "호텔 예약 준비",
        summaryKo: `${dest} 숙소 메인 후보를 준비했어요`,
        diffFromKo: "호텔 없음",
        diffToKo: `Hilton ${dest} 예약 추가`,
        providerLabelKo: "Booking.com",
        placeLabelKo: `Hilton ${dest}`,
        amountLabel: "320,000원",
        cancelPolicyKo: "취소 가능",
        confidencePct: 93,
      },
    }),
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "rental",
      operationId: rentalId,
      labelKo: "렌터카 예약 준비",
      engineId: "rental_car",
      holdMinutes,
      amountLabel: "95,000원",
      dependsOnItemIds: [flightId],
      dependencyNoteKo: "도착 항공 시간에 맞춰 픽업을 잡았어요",
      preview: {
        titleKo: "렌터카 예약 준비",
        summaryKo: `${dest} 공항 픽업 후보`,
        diffFromKo: "렌터카 없음",
        diffToKo: "렌터카 예약 초안 추가",
        providerLabelKo: "렌터카",
        amountLabel: "95,000원",
        cancelPolicyKo: "픽업 6시간 전 무료 취소",
        confidencePct: 85,
      },
    }),
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "eatery",
      operationId: eateryId,
      labelKo: "맛집 예약 준비",
      engineId: "eatery_search",
      holdMinutes,
      preview: {
        titleKo: "맛집 예약 준비",
        summaryKo: `${dest} 근처 후보를 모아 두었어요`,
        diffFromKo: "맛집 예약 없음",
        diffToKo: "맛집 예약 초안 추가",
        confidencePct: 86,
      },
    }),
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "itinerary",
      operationId: itineraryId,
      labelKo: "여행 일정 v1",
      engineId: "trip_experience_search",
      holdMinutes,
      dependsOnItemIds: [lodgingId, flightId],
      dependencyNoteKo: "숙소·항공 초안을 기준으로 일정을 짰어요",
      preview: {
        titleKo: "여행 일정 v1",
        summaryKo: "2박 3일 골격 일정",
        diffFromKo: "일정 없음",
        diffToKo: "여행 일정 v1 추가",
        confidencePct: 84,
      },
    }),
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "finance",
      operationId: financeId,
      labelKo: "총 결제금액",
      engineId: "finance_prep",
      holdMinutes,
      amountLabel: "895,000원",
      dependsOnItemIds: [lodgingId, flightId, rentalId],
      dependencyNoteKo: "항공·호텔·렌터카 합산 · 결제수단 확인이 필요해요",
      preview: {
        titleKo: "총 결제금액",
        summaryKo: "예약 반영 전 합산 금액",
        diffFromKo: "결제 준비 없음",
        diffToKo: "총 895,000원 결제 준비",
        amountLabel: "895,000원",
        confidencePct: 80,
      },
    }),
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "review",
      operationId: cancelId,
      labelKo: "취소 정책",
      holdMinutes,
      dependsOnItemIds: [flightId, lodgingId, rentalId],
      preview: {
        titleKo: "취소 정책",
        summaryKo: "항공·호텔·렌터카 취소 조건을 모았어요",
        cancelPolicyKo: "항공 24h · 호텔 무료 · 렌터 6h",
        confidencePct: 90,
      },
    }),
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "review",
      operationId: conflictId,
      labelKo: "일정 충돌 없음",
      holdMinutes,
      dependsOnItemIds: [flightId, lodgingId, itineraryId],
      preview: {
        titleKo: "일정 충돌 없음",
        summaryKo: "항공 도착 · 체크인 · 렌터 픽업이 겹치지 않아요",
        confidencePct: 92,
      },
    }),
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "review",
      operationId: reviewId,
      labelKo: "AI 검토 완료",
      holdMinutes,
      dependsOnItemIds: [flightId, lodgingId, rentalId, eateryId, financeId],
      preview: {
        titleKo: "AI 검토 완료",
        summaryKo: "가격 비교 · 예약 가능 시간 · 의존 관계를 점검했어요",
        confidencePct: 94,
      },
    }),
  ];

  upsertPreparedRealityOperations(ops);
  void domainFolderLabelKo;
  return ops;
}
