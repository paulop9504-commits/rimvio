import type { MarketAlignmentOffer, MarketIntentRole } from "@/lib/globe/market/market-intent-types";

export type MarketHandshakePhase =
  | "pending_listing"
  | "pending_buyer_start"
  | "active"
  | "declined"
  | "completed";

export type MarketHandshakeViewerAction =
  | "accept_listing"
  | "open_preview"
  | "open_chat";

export type MarketHandshakeRecord = {
  id: string;
  seekingIntentId: string;
  listingIntentId: string;
  seekingUserId: string;
  listingUserId: string;
  threadId: string | null;
  phase: MarketHandshakePhase;
  alignmentScore: number | null;
  priorityHint: string;
  listingAcceptedAtIso: string | null;
  buyerStartedAtIso: string | null;
  seekingConfirmedAtIso: string | null;
  listingConfirmedAtIso: string | null;
  realizedPriceKrw: number | null;
  completedAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
  tradeStatus: import("@/lib/globe/market/market-trade-types").MarketTradeStatus;
  meetMode: import("@/lib/globe/market/market-trade-types").MarketMeetMode;
  meetAtIso: string | null;
  meetPlaceLabel: string | null;
  meetLat: number | null;
  meetLng: number | null;
  guestShareLocation: boolean;
  guestLat: number | null;
  guestLng: number | null;
  guestLocationAtIso: string | null;
  scheduleCandidates: readonly string[];
  preferredMeetDateKey: string | null;
  preferredMeetAtIso: string | null;
  schedulingExpiresAtIso: string | null;
  tradeCancelReasonId: string | null;
  tradeCancelledAtIso: string | null;
};

export type MarketCompletionTraceDraft = {
  handshakeId: string;
  seekingUserId: string;
  listingUserId: string;
  eventId: string;
  title: string;
  placeLabel: string;
  lat: number;
  lng: number;
  priceLine: string;
  role: MarketIntentRole;
  atIso?: string | null;
  productName?: string;
  realizedPriceKrw?: number | null;
  negotiationSummaryKo?: string;
  coordinationLogSummary?: string;
  proposal?: import("@/lib/globe/market/coordination/agent-negotiation-types").AgentNegotiationProposal | null;
  filledSlots?: Partial<
    Record<
      import("@/lib/globe/market/coordination/agent-negotiation-types").AgentNegotiationSlotKey,
      string
    >
  >;
};

export type MarketHandshakeContext = {
  handshake: MarketHandshakeRecord;
  listingTitle: string;
  listingPlaceLabel: string;
  listingPriceLine: string;
  listingCategoryLabel: string;
  listingDetail: import("@/lib/globe/market/market-intent-detail").MarketIntentDetail;
  seekingTitle: string;
  viewerRole: MarketIntentRole;
  viewerUserId: string;
};

export type MarketHandshakeOffer = MarketAlignmentOffer & {
  handshakeId: string;
  handshakePhase: MarketHandshakePhase;
  viewerAction: MarketHandshakeViewerAction;
  threadId: string | null;
};
