import { copy } from "@/lib/copy/human-ko";

/** Map handshake API error codes → L1 copy. */
export function readMarketHandshakeUserError(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return copy.globe.marketAlignBridgeFail;
  }
  if (trimmed.startsWith("not_registered:")) {
    return trimmed.slice("not_registered:".length).trim() || copy.globe.marketAlignBridgeFail;
  }
  switch (trimmed) {
    case "handshake_not_found":
      return "맞춤 정보를 찾지 못했어요.";
    case "listing_only":
      return "내놓기 쪽에서만 수락할 수 있어요.";
    case "seeker_only":
    case "seeking_only":
      return "구하기 쪽에서만 할 수 있어요.";
    case "depart_window_closed":
      return "약속 3시간 전부터 누를 수 있어요.";
    case "meet_not_set":
      return "약속 시간이 아직 없어요.";
    case "scheduling_expired":
      return "응답 시간이 지났어요.";
    case "unauthorized":
      return copy.globe.field.loginRequiredBody;
    case "seeking_not_found":
      return "구하기 맥락을 먼저 등록해 주세요.";
    case "listing_not_found":
      return "매물을 찾지 못했어요.";
    case "no_match":
      return copy.globe.field.handshakeNoMatch;
    case "open_chat_failed":
      return copy.globe.marketAlignBridgeFail;
    case "trade_init_failed":
      return copy.globe.field.tradeInitFail;
    case "handshake_completed":
      return copy.globe.field.handshakeAlreadyCompleted;
    case "invalid_phase":
      return "이미 처리된 맞춤이에요.";
    case "invalid_cancel_reason":
      return "취소 사유를 골라주세요.";
    case "listing_meet_reserved":
      return copy.globe.field.listingMeetReservedToast;
    case "seller_meet_conflict":
      return copy.globe.marketTradeSellerMeetConflict;
    case "cancel_failed":
      return copy.globe.marketTradeCancelFail;
    case "intent_not_found":
      return "등록한 조건을 찾지 못했어요.";
    case "accept_failed":
    case "start_failed":
    case "bridge_failed":
      return copy.globe.marketAlignBridgeFail;
    default:
      return trimmed;
  }
}
