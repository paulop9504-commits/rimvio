/**
 * Seed travel Prepare Operations into Reality Queue (no L5 Commit).
 * Example: 「상하이 2박3일 여행 만들어줘」 → Pending artifacts.
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
}): RealityOperationV1 {
  const domain = queueKindToDomain(input.kind);
  return {
    operationId: input.operationId,
    type: queueKindToOperationType(input.kind),
    domain,
    status: "pending",
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
 * Enqueue classic travel prepare pack into Pending Reality.
 * Returns operations (also written to session store).
 */
export function enqueueTravelPrepareOperations(
  input: TravelPrepareSeedInput,
): readonly RealityOperationV1[] {
  const holdMinutes = input.holdMinutes ?? 15;
  const ctx = input.contextEventId.trim();
  const dest = input.destinationLabelKo.trim() || "여행지";
  const folder = input.contextLabelKo.trim() || `${dest} 여행`;
  const prefix = `op:${ctx}:`;

  const lodgingId = `${prefix}lodging`;
  const flightId = `${prefix}flight`;
  const eateryId = `${prefix}eatery`;
  const itineraryId = `${prefix}itinerary`;
  const financeId = `${prefix}finance`;

  const ops: RealityOperationV1[] = [
    buildOp({
      contextEventId: ctx,
      contextLabelKo: folder,
      kind: "flight",
      operationId: flightId,
      labelKo: "항공권 예약 준비",
      engineId: "flight_booking",
      holdMinutes,
      preview: {
        titleKo: "항공권 예약 준비",
        summaryKo: `${dest} 왕복 후보를 비교해 두었어요`,
        diffFromKo: "항공권 없음",
        diffToKo: `${dest} 항공 예약 초안 추가`,
        providerLabelKo: "항공 검색",
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
      kind: "eatery",
      operationId: eateryId,
      labelKo: "맛집 리스트 생성",
      engineId: "eatery_search",
      holdMinutes,
      preview: {
        titleKo: "맛집 리스트",
        summaryKo: `${dest} 근처 후보를 모아 두었어요`,
        diffFromKo: "맛집 리스트 없음",
        diffToKo: "맛집 리스트 v1 추가",
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
      labelKo: "결제 준비",
      engineId: "finance_prep",
      holdMinutes,
      dependsOnItemIds: [lodgingId, flightId],
      dependencyNoteKo: "결제수단 확인이 필요해요",
      preview: {
        titleKo: "결제 준비",
        summaryKo: "예약 반영 전 결제 수단을 점검해요",
        diffFromKo: "결제 준비 없음",
        diffToKo: "결제 준비 카드 추가",
        confidencePct: 80,
      },
    }),
  ];

  upsertPreparedRealityOperations(ops);
  void domainFolderLabelKo;
  return ops;
}
