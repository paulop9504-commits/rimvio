import type { MarketAvailabilityPreset } from "@/lib/globe/market/market-availability-preset";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

/** Revert UI experiment: git checkout bookmark/pre-transaction-dashboard */
export type MarketHandshakeIntentPair = {
  seekingIntentId: string;
  listingIntentId: string;
};

export type MarketTradeStatus =
  | "chat"
  | "scheduling"
  | "buyer_picked_day"
  | "seller_proposed"
  | "confirmed"
  | "en_route"
  | "meeting"
  | "completed"
  | "expired"
  | "cancelled";

/** Seller anchor (default) vs symmetric midpoint (v2). */
export type MarketMeetMode = "host" | "convergence";

export type MarketTradeProgressStepId =
  | "confirmed"
  | "before_departure"
  | "meeting"
  | "done";

export type MarketTradeSessionRecord = {
  handshakeId: string;
  threadId: string | null;
  phase: string;
  tradeStatus: MarketTradeStatus;
  meetMode: MarketMeetMode;
  listingIntentId: string;
  seekingIntentId: string;
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
  availabilityPreset: MarketAvailabilityPreset;
  seekingConfirmedAtIso: string | null;
  listingConfirmedAtIso: string | null;
  viewerRole: MarketIntentRole;
  productTitle: string;
  priceLine: string;
  photoUrl: string | null;
  videoUrl: string | null;
  updatedAtIso: string;
};

export type MarketTradeProgressStep = {
  id: MarketTradeProgressStepId;
  labelKo: string;
  state: "done" | "active" | "upcoming";
};

export type MarketTradeSessionView = MarketTradeSessionRecord & {
  roleBadgeKo: string;
  statusHeadlineKo: string;
  statusSublineKo: string | null;
  meetAtLabelKo: string | null;
  meetPlaceDisplay: string | null;
  proposalLineKo: string | null;
  progressSteps: readonly MarketTradeProgressStep[];
  activeStepId: MarketTradeProgressStepId;
  countdownLabelKo: string | null;
  showNavigate: boolean;
  showDepart: boolean;
  canDepart: boolean;
  departOpensHintKo: string | null;
  isEnRoute: boolean;
  hostGuestEtaLabelKo: string | null;
  showProposePreferred: boolean;
  preferredMeetAtIso: string | null;
  preferredMeetDateKey: string | null;
  schedulingCountdownKo: string | null;
  showPickDay: boolean;
  showProposeSchedule: boolean;
  showAcceptProposal: boolean;
  showCancelReservation: boolean;
  cancelReasons: readonly { id: string; labelKo: string }[];
  canConfirmHandshakeComplete: boolean;
  awaitingHandshakeOtherParty: boolean;
  handshakeCompleteCtaKo: string | null;
};
