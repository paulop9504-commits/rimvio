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
      return "출발 가능 시간이 아니에요.";
    case "meet_not_set":
      return "약속 시간이 아직 없어요.";
    case "invalid_phase":
      return "이미 처리된 맞춤이에요.";
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
