/**
 * Build / validate ReservationDraft — Prepare Layer only.
 */

import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";
import type {
  PrepareChecklistStep,
  ReservationDateRange,
  ReservationDraft,
  ReservationPrice,
} from "@/lib/callout/prepare/types";
import type { RimvioObject } from "@/lib/callout/types";

export function buildPrepareChecklist(input: {
  object: RimvioObject;
  dateRange: ReservationDateRange;
  guestCount: number;
  price: ReservationPrice;
}): readonly PrepareChecklistStep[] {
  const { object, dateRange, guestCount, price } = input;
  const hasInfo =
    Boolean(dateRange.checkInIso || dateRange.labelKo) &&
    guestCount >= 1 &&
    Boolean(price.labelKo || price.amountWon != null);
  const hasCandidate = object.facts.selected || object.state === "shortlisted";
  const hasConditions =
    object.evidence.filter((e) => e.present).length >= 2 ||
    object.facts.canPrepare;

  return [
    {
      id: "info",
      labelKo: "정보 입력",
      done: hasInfo,
      detailKo: [
        dateRange.labelKo ?? (dateRange.checkInIso ? "날짜" : null),
        guestCount >= 1 ? `인원 ${guestCount}` : null,
        price.labelKo,
      ]
        .filter(Boolean)
        .join(" · ") || "날짜 · 인원 · 가격",
    },
    {
      id: "candidate",
      labelKo: "후보 선택",
      done: hasCandidate,
      detailKo: hasCandidate ? object.title : "아직 선택되지 않았어요",
    },
    {
      id: "conditions",
      labelKo: "조건 확인",
      done: hasConditions,
      detailKo: hasConditions
        ? "Evidence · 예약 가능성 확인"
        : "조건이 더 필요해요",
    },
  ];
}

export function createReservationDraft(input: {
  contextId: string;
  object: RimvioObject;
  dateRange?: Partial<ReservationDateRange> | null;
  guestCount?: number | null;
  price?: Partial<ReservationPrice> | null;
}): ReservationDraft {
  const now = new Date().toISOString();
  const priceLabel =
    input.price?.labelKo ?? input.object.facts.priceLabelKo ?? null;
  const amountWon =
    input.price?.amountWon ?? parseWonAmount(priceLabel) ?? null;

  return {
    draftId: `rsv_${Date.now().toString(36)}_${input.object.id}`,
    objectId: input.object.id,
    contextId: input.contextId,
    title: input.object.title,
    dateRange: {
      checkInIso: input.dateRange?.checkInIso ?? null,
      checkOutIso: input.dateRange?.checkOutIso ?? null,
      labelKo: input.dateRange?.labelKo ?? null,
    },
    guestCount: Math.max(1, input.guestCount ?? 2),
    price: {
      amountWon,
      labelKo: priceLabel,
    },
    status: "draft",
    createdAtIso: now,
    updatedAtIso: now,
  };
}

/** Guard — Prepare path must never Reality Commit. */
export function assertPrepareDoesNotCommit(op: string): void {
  if (op === "commit") {
    throw new Error(
      "Prepare Mode cannot Reality Commit — ReservationDraft only",
    );
  }
}

export function reservationDraftSummaryKo(draft: ReservationDraft): string {
  const bits = [
    draft.dateRange.labelKo,
    `인원 ${draft.guestCount}`,
    draft.price.labelKo,
  ].filter(Boolean);
  return bits.join(" · ") || draft.title;
}
