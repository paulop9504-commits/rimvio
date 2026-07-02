import type {
  AgentNegotiationLogEntry,
  AgentNegotiationProposal,
  AgentNegotiationSlotKey,
} from "@/lib/globe/market/coordination/agent-negotiation-types";
import { parsePriceToWon } from "@/lib/links/extract-price-hint";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

export type NegotiationTraceContext = {
  productName: string;
  realizedPriceKrw: number | null;
  negotiationSummaryKo: string;
  coordinationLogSummary: string;
  priceLine: string;
  proposal: AgentNegotiationProposal | null;
  filledSlots: Partial<Record<AgentNegotiationSlotKey, string>>;
};

function parseNegotiatedPriceKrw(priceKo: string | null | undefined): number | null {
  const fromWon = parsePriceToWon(priceKo);
  if (fromWon !== null) {
    return fromWon;
  }
  if (!priceKo?.trim()) {
    return null;
  }
  const manwon = priceKo.match(/(\d+(?:\.\d+)?)\s*만\s*원?/u);
  if (manwon?.[1]) {
    const value = Number.parseFloat(manwon[1]);
    return Number.isFinite(value) ? Math.round(value * 10_000) : null;
  }
  const cheon = priceKo.match(/(\d+(?:\.\d+)?)\s*천\s*원?/u);
  if (cheon?.[1]) {
    const value = Number.parseFloat(cheon[1]);
    return Number.isFinite(value) ? Math.round(value * 1_000) : null;
  }
  return null;
}

/** Compact log excerpt — not full log_json dump. */
export function buildCoordinationLogSummary(
  log: readonly AgentNegotiationLogEntry[],
): string {
  const parts: string[] = [];
  for (let index = log.length - 1; index >= 0 && parts.length < 3; index -= 1) {
    const entry = log[index]!;
    if (entry.type === "agent") {
      const text = entry.text.trim().slice(0, 80);
      if (text) {
        parts.unshift(text);
      }
      continue;
    }
    if (entry.type === "system") {
      const text = entry.text.trim().slice(0, 60);
      if (text) {
        parts.unshift(text);
      }
      continue;
    }
    if (entry.type === "user_injected") {
      parts.unshift(`${entry.labelKo}: ${entry.valueKo}`.slice(0, 72));
    }
  }
  return parts.join(" · ");
}

export function buildNegotiationSummaryKo(input: {
  productName: string;
  proposal: AgentNegotiationProposal | null;
  filledSlots: Partial<Record<AgentNegotiationSlotKey, string>>;
  realizedPriceKrw: number | null;
  priceLine: string;
  viewerRole: MarketIntentRole;
}): string {
  const price =
    input.proposal?.priceKo?.trim() ||
    input.filledSlots.max_price_krw?.trim() ||
    input.filledSlots.min_price_krw?.trim() ||
    input.priceLine;
  const meetTime =
    input.proposal?.meetTimeKo?.trim() ||
    input.filledSlots.meet_time_label?.trim() ||
    "";
  const meetPlace = input.proposal?.meetPlaceKo?.trim() || "";
  const roleLabel = input.viewerRole === "listing" ? "넘김" : "맞춤";

  return [input.productName, price, meetTime, meetPlace, roleLabel]
    .filter((part) => part.length > 0)
    .join(" · ");
}

/** Fold APPROVED / completed negotiation into trace recall fields. */
export function buildNegotiationTraceContext(input: {
  productName: string;
  priceLine: string;
  viewerRole: MarketIntentRole;
  realizedPriceKrw: number | null;
  proposal: AgentNegotiationProposal | null;
  filledSlots: Partial<Record<AgentNegotiationSlotKey, string>>;
  log: readonly AgentNegotiationLogEntry[];
}): NegotiationTraceContext {
  const proposalPrice = parseNegotiatedPriceKrw(input.proposal?.priceKo);
  const slotPrice =
    parseNegotiatedPriceKrw(input.filledSlots.max_price_krw) ??
    parseNegotiatedPriceKrw(input.filledSlots.min_price_krw);
  const realizedPriceKrw =
    input.realizedPriceKrw ?? proposalPrice ?? slotPrice ?? null;
  const priceLine =
    input.proposal?.priceKo?.trim() ||
    (realizedPriceKrw !== null
      ? `${Math.round(realizedPriceKrw / 10_000)}만원`
      : input.priceLine);

  return {
    productName: input.productName,
    realizedPriceKrw,
    negotiationSummaryKo: buildNegotiationSummaryKo({
      productName: input.productName,
      proposal: input.proposal,
      filledSlots: input.filledSlots,
      realizedPriceKrw,
      priceLine,
      viewerRole: input.viewerRole,
    }),
    coordinationLogSummary: buildCoordinationLogSummary(input.log),
    priceLine,
    proposal: input.proposal,
    filledSlots: input.filledSlots,
  };
}
