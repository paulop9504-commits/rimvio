import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { AlignmentChatListItem } from "@/lib/peer-chat/alignment-chat-types";
import type {
  ExternalOpportunityCta,
  ExternalOpportunityKind,
} from "@/lib/external-context-ask/external-context-opportunity-types";

export type NormalizedExternalOpportunity = {
  id: string;
  kind: ExternalOpportunityKind;
  title: string;
  placeLabel: string;
  subtitle: string;
  bridgeKindKo: string;
  atIso: string | null;
  searchText: string;
  primaryCta: ExternalOpportunityCta;
  threadId?: string;
  handshakeId?: string;
  eventId?: string;
  traceId?: string;
  lat?: number;
  lng?: number;
};

function roleSubtitle(role: MarketIntentRecord["role"]): string {
  return role === "listing" ? "내놓기" : "구매";
}

export function normalizeAlignmentChat(
  item: AlignmentChatListItem,
): NormalizedExternalOpportunity {
  return {
    id: `alignment:${item.handshakeId}`,
    kind: "alignment_chat",
    title: item.title,
    placeLabel: item.placeLabel,
    subtitle: item.otherDisplayName,
    bridgeKindKo: "맞춤",
    atIso: item.updatedAtIso,
    searchText: `${item.title} ${item.placeLabel} ${item.otherDisplayName}`,
    primaryCta: "chat",
    threadId: item.threadId,
    handshakeId: item.handshakeId,
  };
}

export function normalizeMarketIntent(
  intent: MarketIntentRecord,
): NormalizedExternalOpportunity {
  return {
    id: `market:${intent.id}`,
    kind: "market_intent",
    title: intent.title,
    placeLabel: intent.placeLabel,
    subtitle: roleSubtitle(intent.role),
    bridgeKindKo: "맞춤",
    atIso: intent.confirmedAtIso,
    searchText: `${intent.title} ${intent.placeLabel} ${intent.categoryId}`,
    primaryCta: "trade",
    eventId: intent.eventId,
    lat: intent.anchorLat,
    lng: intent.anchorLng,
  };
}

export function normalizeExternalTrace(
  trace: ExternalGlobeTrace,
): NormalizedExternalOpportunity {
  return {
    id: `trace:${trace.traceId}`,
    kind: "external_trace",
    title: trace.title,
    placeLabel: trace.placeLabel,
    subtitle: trace.authorDisplayName?.trim() || "다른 사람",
    bridgeKindKo: "흔적",
    atIso: trace.startedAtIso,
    searchText: `${trace.title} ${trace.placeLabel} ${trace.recallLine ?? ""}`,
    primaryCta: "view_map",
    eventId: trace.eventId,
    traceId: trace.traceId,
    lat: trace.lat,
    lng: trace.lng,
  };
}

export function normalizeExternalContextSources(input: {
  alignmentChats: readonly AlignmentChatListItem[];
  marketIntents: readonly MarketIntentRecord[];
  traces: readonly ExternalGlobeTrace[];
}): NormalizedExternalOpportunity[] {
  const rows: NormalizedExternalOpportunity[] = [];
  for (const item of input.alignmentChats) {
    rows.push(normalizeAlignmentChat(item));
  }
  for (const intent of input.marketIntents) {
    if (intent.active) {
      rows.push(normalizeMarketIntent(intent));
    }
  }
  for (const trace of input.traces) {
    rows.push(normalizeExternalTrace(trace));
  }
  return rows;
}
