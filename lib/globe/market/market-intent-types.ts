import type { MarketIntentDetail } from "@/lib/globe/market/market-intent-detail";

export type { MarketIntentDetail } from "@/lib/globe/market/market-intent-detail";
export { DEFAULT_MARKET_INTENT_DETAIL } from "@/lib/globe/market/market-intent-detail";

export type MarketIntentRole = "listing" | "seeking";

export type MarketCategoryId =
  | "market.phone"
  | "market.bike"
  | "market.furniture"
  | "market.fashion"
  | "market.camera"
  | "market.camping"
  | "market.instrument"
  | "market.outdoor"
  | "market.general";

/** Normalized condition — Rimvio SSOT for v0 alignment (no user DSL). */
export type MarketIntentRecord = {
  id: string;
  userId?: string | null;
  eventId: string;
  role: MarketIntentRole;
  categoryId: MarketCategoryId;
  title: string;
  priceMinKrw: number | null;
  priceMaxKrw: number | null;
  radiusKm: number;
  anchorLat: number;
  anchorLng: number;
  placeLabel: string;
  /** Memory / Pulse prefill — soft rank only in v0 */
  peakHour: string | null;
  confirmedAtIso: string;
  active: boolean;
  detail: MarketIntentDetail;
};

export type MarketIntentDraft = Omit<
  MarketIntentRecord,
  "id" | "confirmedAtIso" | "active"
> & {
  prefillSources: string[];
};

export type MarketAlignmentOffer = {
  selfIntentId: string;
  matchIntentId: string;
  selfEventId: string;
  matchEventId: string;
  role: MarketIntentRole;
  headline: string;
  body: string;
  ctaLabel: string;
  matchLat: number;
  matchLng: number;
  matchPlaceLabel: string;
  distanceKm: number;
  categoryId: MarketCategoryId;
  sourceRef: "market:alignment_v1.2";
  alignmentScore?: number;
  priorityHintKo?: string;
  handshakeId?: string;
  handshakePhase?: import("@/lib/globe/market/market-handshake-types").MarketHandshakePhase;
  viewerAction?: import("@/lib/globe/market/market-handshake-types").MarketHandshakeViewerAction;
  threadId?: string | null;
  matchUserId?: string | null;
  matchDisplayName?: string | null;
  matchIntentServerId?: string | null;
  selfIntentServerId?: string | null;
};

export const MARKET_INTENT_META_KEY = "marketIntent" as const;
