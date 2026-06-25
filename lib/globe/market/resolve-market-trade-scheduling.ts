import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import { MARKET_SCHEDULING_SLA_HOURS } from "@/lib/globe/market/market-availability-preset";

export function isMarketTradeSchedulingExpired(
  handshake: Pick<
    MarketHandshakeRecord,
    "tradeStatus" | "schedulingExpiresAtIso"
  >,
  now = new Date(),
): boolean {
  if (handshake.tradeStatus !== "scheduling") {
    return false;
  }
  const expiresAt = handshake.schedulingExpiresAtIso
    ? Date.parse(handshake.schedulingExpiresAtIso)
    : NaN;
  if (!Number.isFinite(expiresAt)) {
    return false;
  }
  return now.getTime() >= expiresAt;
}

export function formatMarketTradeSchedulingCountdown(
  schedulingExpiresAtIso: string | null,
  now = new Date(),
): string | null {
  if (!schedulingExpiresAtIso) {
    return null;
  }
  const expiresAt = Date.parse(schedulingExpiresAtIso);
  if (!Number.isFinite(expiresAt)) {
    return null;
  }
  const diffMs = expiresAt - now.getTime();
  if (diffMs <= 0) {
    return null;
  }
  const totalMin = Math.round(diffMs / 60_000);
  if (totalMin < 60) {
    return `${totalMin}분 남음`;
  }
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) {
    return `${hours}시간 남음`;
  }
  return `${hours}시간 ${mins}분 남음`;
}

export function schedulingSlaLabelKo(): string {
  return `${MARKET_SCHEDULING_SLA_HOURS}시간`;
}

export function isScheduleCandidateAllowed(
  meetAtIso: string,
  candidates: readonly string[],
): boolean {
  const target = Date.parse(meetAtIso);
  if (!Number.isFinite(target)) {
    return false;
  }
  return candidates.some((slot) => Date.parse(slot) === target);
}
