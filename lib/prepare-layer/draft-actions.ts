/**
 * Prepare Draft Actions — build payloads only (never execute Reality).
 *
 * Allowed:
 *  - 호텔 예약 정보 입력
 *  - 항공 정보 정리
 *  - 구매 후보 생성
 *  - 일정 확정 준비
 */

import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";
import type {
  FlightPreparePayload,
  PrepareAction,
  PurchaseCandidatePayload,
  ReservationPreparePayload,
  SchedulePreparePayload,
} from "@/lib/prepare-layer/types";

function addDaysYmd(ymd: string, days: number): string {
  const t = Date.parse(`${ymd}T12:00:00.000Z`);
  if (!Number.isFinite(t)) return ymd;
  const next = new Date(t + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

export function resolvePrepareAction(
  utterance: string,
): PrepareAction | null {
  const t = utterance.trim();
  if (!t) return null;

  // Forbidden verbs handled by validator — still classify intent for reject copy
  if (/결제|결제해|결제\s*진행|pay\s*now/iu.test(t)) return null;
  if (/예약\s*확정|확정\s*예약|바로\s*예약|book\s*now/iu.test(t)) return null;
  if (/구매\s*실행|지금\s*사|구매해\s*줘|구매\s*확정|checkout/iu.test(t)) {
    return null;
  }

  if (
    /예약\s*준비|준비해|prepare\s*reserv|reservation\s*prepare|호텔\s*예약/iu.test(
      t,
    )
  ) {
    return "reservation_prepare";
  }
  if (/항공|비행기|flight\s*prepare|항공\s*정리/iu.test(t)) {
    return "flight_prepare";
  }
  if (/구매\s*후보|장바구니|구매\s*준비|purchase\s*candidate/iu.test(t)) {
    return "purchase_candidate";
  }
  if (/일정\s*확정\s*준비|일정\s*준비|스케줄\s*준비|schedule\s*prepare/iu.test(t)) {
    return "schedule_prepare";
  }
  return null;
}

export function buildReservationPreparePayload(input: {
  readonly hotelTitle: string;
  readonly checkInIso?: string | null;
  readonly checkOutIso?: string | null;
  readonly dateLabelKo?: string | null;
  readonly guests?: number | null;
  readonly priceWon?: number | null;
  readonly priceLabelKo?: string | null;
  readonly nights?: number | null;
  readonly options?: Readonly<Record<string, unknown>>;
}): ReservationPreparePayload {
  const today = new Date().toISOString().slice(0, 10);
  const nights =
    input.nights != null && Number.isFinite(input.nights) && input.nights >= 1
      ? Math.floor(input.nights)
      : 2;
  const checkInIso = input.checkInIso ?? today;
  const checkOutIso = input.checkOutIso ?? addDaysYmd(checkInIso, nights);
  const priceLabelKo =
    input.priceLabelKo ??
    (input.priceWon != null
      ? `${Math.round(input.priceWon).toLocaleString("ko-KR")}원`
      : null);
  const amountWon =
    input.priceWon ?? parseWonAmount(priceLabelKo) ?? null;

  return {
    kind: "reservation",
    dates: {
      checkInIso,
      checkOutIso,
      labelKo:
        input.dateLabelKo ??
        `${checkInIso} → ${checkOutIso} · ${nights}박`,
    },
    guests: Math.max(1, input.guests ?? 2),
    price: {
      amountWon,
      labelKo: priceLabelKo,
    },
    options: {
      breakfast: false,
      refundable: null,
      roomType: null,
      ...(input.options ?? {}),
    },
    hotelTitle: input.hotelTitle,
  };
}

export function buildFlightPreparePayload(input: {
  readonly routeLabelKo?: string | null;
  readonly departIso?: string | null;
  readonly returnIso?: string | null;
  readonly passengers?: number | null;
  readonly priceLabelKo?: string | null;
  readonly options?: Readonly<Record<string, unknown>>;
}): FlightPreparePayload {
  return {
    kind: "flight",
    routeLabelKo: input.routeLabelKo ?? null,
    departIso: input.departIso ?? null,
    returnIso: input.returnIso ?? null,
    passengers: Math.max(1, input.passengers ?? 1),
    priceLabelKo: input.priceLabelKo ?? null,
    options: { ...(input.options ?? {}) },
  };
}

export function buildPurchaseCandidatePayload(input: {
  readonly itemTitle: string;
  readonly quantity?: number | null;
  readonly priceLabelKo?: string | null;
  readonly options?: Readonly<Record<string, unknown>>;
}): PurchaseCandidatePayload {
  return {
    kind: "purchase_candidate",
    itemTitle: input.itemTitle,
    quantity: Math.max(1, input.quantity ?? 1),
    priceLabelKo: input.priceLabelKo ?? null,
    options: { ...(input.options ?? {}) },
  };
}

export function buildSchedulePreparePayload(input: {
  readonly titleKo: string;
  readonly startIso?: string | null;
  readonly endIso?: string | null;
  readonly options?: Readonly<Record<string, unknown>>;
}): SchedulePreparePayload {
  return {
    kind: "schedule",
    titleKo: input.titleKo,
    startIso: input.startIso ?? null,
    endIso: input.endIso ?? null,
    options: { ...(input.options ?? {}) },
  };
}

export function summarizePreparePayload(
  action: PrepareAction,
  payload: Readonly<Record<string, unknown>>,
): string {
  if (action === "reservation_prepare") {
    const dates = payload.dates as
      | { labelKo?: string | null }
      | undefined;
    const guests = payload.guests;
    const price = payload.price as { labelKo?: string | null } | undefined;
    const hotel = String(payload.hotelTitle ?? "호텔");
    return [
      `Reservation Prepare · ${hotel}`,
      dates?.labelKo ? `날짜 ${dates.labelKo}` : null,
      typeof guests === "number" ? `인원 ${guests}` : null,
      price?.labelKo ? `가격 ${price.labelKo}` : null,
      "옵션 정리됨",
      "Commit 전 대기",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (action === "flight_prepare") {
    return [
      "Flight Prepare",
      payload.routeLabelKo ? String(payload.routeLabelKo) : null,
      "Commit 전 대기",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (action === "purchase_candidate") {
    return [
      "Purchase Candidate",
      String(payload.itemTitle ?? ""),
      "Commit 전 대기",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [
    "Schedule Prepare",
    String(payload.titleKo ?? ""),
    "Commit 전 대기",
  ]
    .filter(Boolean)
    .join(" · ");
}
