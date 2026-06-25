export type ExternalQueryIntent =
  | "trade"
  | "gathering"
  | "travel"
  | "study"
  | "general";

export type ExternalOpportunityKind =
  | "alignment_chat"
  | "market_intent"
  | "external_trace";

export type ExternalOpportunityCta =
  | "join"
  | "chat"
  | "trade"
  | "view_map"
  | "open_bridge";

export type ExternalContextOpportunityHit = {
  id: string;
  kind: ExternalOpportunityKind;
  title: string;
  placeLabel: string;
  subtitle: string;
  bridgeKindKo: string;
  atIso: string | null;
  reasonKo: string;
  primaryCta: ExternalOpportunityCta;
  threadId?: string;
  handshakeId?: string;
  eventId?: string;
  traceId?: string;
  lat?: number;
  lng?: number;
};

export type ExternalContextAskKind = "opportunities" | "empty";

export type ExternalContextAskResult = {
  kind: ExternalContextAskKind;
  intent: ExternalQueryIntent;
  hits: readonly ExternalContextOpportunityHit[];
  narrativeKo: string;
  summaryKo: string;
  recommendedHitId: string | null;
};

export type ExternalContextSources = {
  alignmentChats: readonly import("@/lib/peer-chat/alignment-chat-types").AlignmentChatListItem[];
  marketIntents: readonly import("@/lib/globe/market/market-intent-types").MarketIntentRecord[];
  traces: readonly import("@/lib/globe/external-globe-trace-types").ExternalGlobeTrace[];
};
