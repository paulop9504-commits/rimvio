/**
 * Add a discovered place into Execution Inbox — prepare only, never Commit.
 * Distinctive Rimvio verb: explore → Info → Inbox → Approve → Reality Commit.
 */

import { resolveBookingProviderForOperation } from "@/lib/booking-runtime/resolve-booking-provider";
import type { BookingProviderId } from "@/lib/booking-runtime/types";
import { syncRealityPipelineAfterOperationChange } from "@/lib/reality-pipeline";
import {
  queueKindToDomain,
  queueKindToOperationType,
} from "@/lib/reality-queue/operation-taxonomy";
import { upsertPreparedRealityOperation } from "@/lib/reality-queue/prepared-operations-store";
import type {
  RealityOperationV1,
  RealityQueueItemKind,
} from "@/lib/reality-queue/types";

export type PlacePrepEnqueueInput = {
  contextEventId: string;
  contextLabelKo?: string | null;
  placeId: string;
  placeName: string;
  kind: "eatery" | "lodging" | "activity";
  partySize?: number | null;
  reserveAtLabelKo?: string | null;
  amountLabel?: string | null;
  depositLabelKo?: string | null;
  walkMinutes?: number | null;
  budgetWon?: number | null;
  reasonLinesKo?: readonly string[] | null;
  lat?: number | null;
  lng?: number | null;
  holdMinutes?: number;
  /** maps:ChIJ… or raw Google place id */
  googlePlaceId?: string | null;
  liteapiOfferId?: string | null;
  bookingProvider?: BookingProviderId | null;
};

function expiresInMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function kindFromPlace(
  kind: PlacePrepEnqueueInput["kind"],
): RealityQueueItemKind {
  if (kind === "lodging") {
    return "lodging";
  }
  if (kind === "activity") {
    return "other";
  }
  return "eatery";
}

function engineForProvider(
  kind: RealityQueueItemKind,
  provider: BookingProviderId,
): string | null {
  if (provider === "google_maps_reserve") {
    return "google_maps_reserve";
  }
  if (provider === "liteapi_booking") {
    return "liteapi_booking";
  }
  if (kind === "lodging") {
    return "lodging_search";
  }
  if (kind === "eatery") {
    return "eatery_search";
  }
  return null;
}

function resolveSourceRef(input: PlacePrepEnqueueInput): string {
  const google =
    input.googlePlaceId?.trim() ||
    (input.placeId.trim().startsWith("maps:")
      ? input.placeId.trim()
      : null);
  if (google) {
    return google.startsWith("maps:") ? google : `maps:${google}`;
  }
  return input.placeId.trim() || "place";
}

function resolveProvider(input: PlacePrepEnqueueInput): BookingProviderId {
  if (input.bookingProvider) {
    return input.bookingProvider;
  }
  const sourceRef = resolveSourceRef(input);
  const draft: RealityOperationV1 = {
    operationId: "op:draft",
    type: "booking_prep",
    domain: queueKindToDomain(kindFromPlace(input.kind)),
    status: "pending",
    contextEventId: input.contextEventId,
    contextLabelKo: null,
    labelKo: input.placeName,
    createdBy: "ai_assistant",
    preview: {
      titleKo: input.placeName,
      summaryKo: input.placeName,
      resourceId: input.liteapiOfferId ?? null,
    },
    needApproval: true,
    dependsOnItemIds: [],
    dependencyNoteKo: null,
    undoAllowed: true,
    expiresAtIso: null,
    sourceRef,
    engineId: null,
    kind: kindFromPlace(input.kind),
  };
  return resolveBookingProviderForOperation(draft);
}

/**
 * Enqueue place reservation prep into Execution Inbox.
 * Status stays pending until Reflect / CEO Sign.
 */
export function enqueuePlacePrepToExecutionInbox(
  input: PlacePrepEnqueueInput,
): RealityOperationV1 {
  const holdMinutes = input.holdMinutes ?? 30;
  const ctx = input.contextEventId.trim();
  const placeId = input.placeId.trim() || "place";
  const name = input.placeName.trim() || "장소";
  const kind = kindFromPlace(input.kind);
  const party = input.partySize && input.partySize > 0 ? input.partySize : 2;
  const timeLabel = input.reserveAtLabelKo?.trim() || "19:00";
  const amount =
    input.amountLabel?.trim() ||
    (input.budgetWon != null && Number.isFinite(input.budgetWon)
      ? `${(input.budgetWon * party).toLocaleString("ko-KR")}원`
      : null);
  const deposit = input.depositLabelKo?.trim() || "예약금 없음";
  const folder =
    input.contextLabelKo?.trim() ||
    (kind === "lodging" ? "숙소 준비" : "식사 준비");

  const reasons = (input.reasonLinesKo ?? []).filter(Boolean).slice(0, 4);
  const summaryParts = [
    `예약 준비 완료`,
    `인원 ${party}명`,
    timeLabel,
    deposit,
  ];
  if (amount) {
    summaryParts.push(`결제 예상 ${amount}`);
  }

  const operationId = `op:${ctx}:place:${placeId}`;
  const sourceRef = resolveSourceRef(input);
  const provider = resolveProvider(input);
  const op: RealityOperationV1 = {
    operationId,
    type: queueKindToOperationType(kind),
    domain: queueKindToDomain(kind),
    status: "pending",
    contextEventId: ctx,
    contextLabelKo: folder,
    labelKo: name,
    createdBy: "ai_assistant",
    preview: {
      titleKo: name,
      summaryKo: summaryParts.join(" · "),
      diffFromKo: "예약 없음",
      diffToKo: `${name} 예약 초안 추가`,
      placeLabelKo: name,
      amountLabel: amount,
      cancelPolicyKo: deposit,
      confidencePct: 90,
      providerLabelKo:
        provider === "google_maps_reserve"
          ? "Google Maps"
          : provider === "liteapi_booking"
            ? "LiteAPI"
            : null,
      resourceId: input.liteapiOfferId?.trim() || null,
    },
    needApproval: true,
    dependsOnItemIds: [],
    dependencyNoteKo:
      reasons.length > 0
        ? reasons.map((line) => `✔ ${line}`).join(" · ")
        : "아직 실행되지 않았습니다.",
    undoAllowed: true,
    expiresAtIso: expiresInMinutes(holdMinutes),
    sourceRef,
    engineId: engineForProvider(kind, provider),
    kind,
    amountLabel: amount,
    detailKo: "아직 실행되지 않았습니다.",
  };

  upsertPreparedRealityOperation(op);
  syncRealityPipelineAfterOperationChange({
    contextEventId: ctx,
    utterance: `${name} · ${folder}`,
    contextLabelKo: folder,
    destinationLabelKo: folder,
  });
  return op;
}
