import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  AgentNegotiationProposal,
  AgentNegotiationSlotKey,
} from "@/lib/globe/market/coordination/agent-negotiation-types";
import { MARKET_COMPLETION_META_KEY } from "@/lib/globe/market/market-completion-pinned-store";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

export type MarketCompletionMeta = {
  handshakeId: string;
  role: MarketIntentRole;
  priceLine: string;
  productName?: string;
  realizedPriceKrw?: number | null;
  negotiationSummaryKo?: string;
  coordinationLogSummary?: string;
  proposal?: AgentNegotiationProposal | null;
  filledSlots?: Partial<Record<AgentNegotiationSlotKey, string>>;
};

function readProposal(value: unknown): AgentNegotiationProposal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const priceKo = typeof row.priceKo === "string" ? row.priceKo : "";
  const meetTimeKo = typeof row.meetTimeKo === "string" ? row.meetTimeKo : "";
  const meetPlaceKo = typeof row.meetPlaceKo === "string" ? row.meetPlaceKo : "";
  if (!priceKo && !meetTimeKo && !meetPlaceKo) {
    return null;
  }
  return { priceKo, meetTimeKo, meetPlaceKo };
}

function readFilledSlots(
  value: unknown,
): Partial<Record<AgentNegotiationSlotKey, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Partial<Record<AgentNegotiationSlotKey, string>> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string" && raw.trim()) {
      out[key as AgentNegotiationSlotKey] = raw.trim();
    }
  }
  return out;
}

/** Pure read — market completion fold from EventCandidate metadata. */
export function readMarketCompletionMeta(
  event: EventCandidate,
): MarketCompletionMeta | null {
  const raw = event.metadata?.[MARKET_COMPLETION_META_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const handshakeId =
    typeof row.handshakeId === "string" ? row.handshakeId.trim() : "";
  const role = row.role === "seeking" || row.role === "listing" ? row.role : null;
  const priceLine = typeof row.priceLine === "string" ? row.priceLine.trim() : "";
  if (!handshakeId || !role || !priceLine) {
    return null;
  }

  const realizedPriceKrw =
    typeof row.realizedPriceKrw === "number" && Number.isFinite(row.realizedPriceKrw)
      ? row.realizedPriceKrw
      : row.realizedPriceKrw === null
        ? null
        : undefined;

  return {
    handshakeId,
    role,
    priceLine,
    productName:
      typeof row.productName === "string" ? row.productName.trim() || undefined : undefined,
    realizedPriceKrw,
    negotiationSummaryKo:
      typeof row.negotiationSummaryKo === "string"
        ? row.negotiationSummaryKo.trim() || undefined
        : undefined,
    coordinationLogSummary:
      typeof row.coordinationLogSummary === "string"
        ? row.coordinationLogSummary.trim() || undefined
        : undefined,
    proposal: readProposal(row.proposal),
    filledSlots: readFilledSlots(row.filledSlots),
  };
}

export function marketCompletionSearchBlob(meta: MarketCompletionMeta): string {
  return [
    meta.productName,
    meta.priceLine,
    meta.negotiationSummaryKo,
    meta.coordinationLogSummary,
    meta.proposal?.priceKo,
    meta.proposal?.meetPlaceKo,
    meta.proposal?.meetTimeKo,
    ...Object.values(meta.filledSlots ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
