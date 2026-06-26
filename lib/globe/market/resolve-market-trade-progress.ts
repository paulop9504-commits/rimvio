import type { MarketTradeProgressStep, MarketTradeProgressStepId, MarketTradeStatus } from "@/lib/globe/market/market-trade-types";
import { computeMarketTradeHostEta } from "@/lib/globe/market/compute-market-trade-host-eta";
import { MARKET_TRADE_DEPART_WINDOW_BEFORE_MS } from "@/lib/globe/market/market-trade-depart-window";

const DEPARTURE_LEAD_MS = MARKET_TRADE_DEPART_WINDOW_BEFORE_MS;
const MEETING_WINDOW_MS = 45 * 60 * 1000;

export function resolveMarketTradeActiveStep(input: {
  tradeStatus: MarketTradeStatus;
  meetAtIso: string | null;
  meetLat?: number | null;
  meetLng?: number | null;
  guestLat?: number | null;
  guestLng?: number | null;
  guestLocationAtIso?: string | null;
  now?: Date;
}): MarketTradeProgressStepId {
  const now = input.now ?? new Date();
  if (input.tradeStatus === "completed") {
    return "done";
  }

  if (input.tradeStatus === "en_route") {
    const eta = computeMarketTradeHostEta({
      guestLat: input.guestLat ?? null,
      guestLng: input.guestLng ?? null,
      guestLocationAtIso: input.guestLocationAtIso ?? null,
      anchorLat: input.meetLat ?? null,
      anchorLng: input.meetLng ?? null,
      now,
    });
    if (eta?.arrived) {
      return "meeting";
    }
    return "before_departure";
  }

  const meetAt = input.meetAtIso ? new Date(input.meetAtIso).getTime() : NaN;
  if (!Number.isFinite(meetAt)) {
    return input.tradeStatus === "scheduling" ? "confirmed" : "confirmed";
  }
  if (now.getTime() >= meetAt + MEETING_WINDOW_MS) {
    return "done";
  }
  if (now.getTime() >= meetAt - 15 * 60 * 1000) {
    return "meeting";
  }
  if (now.getTime() >= meetAt - DEPARTURE_LEAD_MS) {
    return "before_departure";
  }
  return "confirmed";
}

export function buildMarketTradeProgressSteps(input: {
  activeStepId: MarketTradeProgressStepId;
  labels: {
    confirmed: string;
    beforeDeparture: string;
    meeting: string;
    done: string;
  };
}): MarketTradeProgressStep[] {
  const order: MarketTradeProgressStepId[] = [
    "confirmed",
    "before_departure",
    "meeting",
    "done",
  ];
  const labelById: Record<MarketTradeProgressStepId, string> = {
    confirmed: input.labels.confirmed,
    before_departure: input.labels.beforeDeparture,
    meeting: input.labels.meeting,
    done: input.labels.done,
  };
  const activeIndex = order.indexOf(input.activeStepId);

  return order.map((id, index) => ({
    id,
    labelKo: labelById[id],
    state:
      index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming",
  }));
}

export function formatMarketTradeMeetAtLabel(iso: string, now = new Date()): string {
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) {
    return "";
  }
  const weekday = at.toLocaleDateString("ko-KR", { weekday: "short" });
  const monthDay = at.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
  const time = at.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  return `${monthDay} (${weekday}) ${time}`;
}

export function formatMarketTradeCountdownLabel(
  meetAtIso: string,
  now = new Date(),
): string | null {
  const meetAt = new Date(meetAtIso).getTime();
  if (!Number.isFinite(meetAt)) {
    return null;
  }
  const diffMs = meetAt - now.getTime();
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

export function formatMarketTradeProposalLine(
  meetAtIso: string,
  prefix: string,
): string {
  const label = formatMarketTradeMeetAtLabel(meetAtIso);
  return label ? `${prefix} ${label}` : prefix;
}
