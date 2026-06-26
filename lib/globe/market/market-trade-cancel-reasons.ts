export type MarketTradeCancelReasonId =
  | "schedule_conflict"
  | "personal_urgent"
  | "too_far"
  | "want_to_postpone"
  | "price_mismatch"
  | "condition_changed"
  | "no_response";

export type MarketTradeCancelReason = {
  id: MarketTradeCancelReasonId;
  labelKo: string;
};

/** Frequent reservation cancel reasons — card picker SSOT. */
export const MARKET_TRADE_CANCEL_REASONS: readonly MarketTradeCancelReason[] = [
  { id: "schedule_conflict", labelKo: "일정이 겹쳤어요" },
  { id: "personal_urgent", labelKo: "갑자기 일이 생겼어요" },
  { id: "too_far", labelKo: "거리가 멀어요" },
  { id: "want_to_postpone", labelKo: "다른 날로 미루고 싶어요" },
  { id: "price_mismatch", labelKo: "가격이 맞지 않아요" },
  { id: "condition_changed", labelKo: "상품 상태가 달라요" },
  { id: "no_response", labelKo: "연락이 잘 안 돼요" },
];

export function readMarketTradeCancelReasonId(
  raw: unknown,
): MarketTradeCancelReasonId | null {
  if (typeof raw !== "string") {
    return null;
  }
  const id = raw.trim() as MarketTradeCancelReasonId;
  return MARKET_TRADE_CANCEL_REASONS.some((reason) => reason.id === id) ? id : null;
}

export function marketTradeCancelReasonLabelKo(
  reasonId: MarketTradeCancelReasonId,
): string {
  return (
    MARKET_TRADE_CANCEL_REASONS.find((reason) => reason.id === reasonId)?.labelKo ??
    reasonId
  );
}
