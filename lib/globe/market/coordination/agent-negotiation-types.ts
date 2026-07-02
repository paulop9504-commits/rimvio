import type { MarketAvailabilityPreset } from "@/lib/globe/market/market-availability-preset";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { AgentNegotiationSlotChipContext } from "@/lib/globe/market/coordination/agent-negotiation-slot-chips";

export type AgentNegotiationState =
  | "NEGOTIATING"
  | "WAITING_USER_INPUT"
  | "AGREED"
  | "STUCK"
  | "PAUSED"
  | "APPROVED";

export type AgentNegotiationLogEntry =
  | {
      type: "agent";
      side: "self" | "peer";
      /** SSOT — both participants see the same agent role. */
      role: MarketIntentRole;
      text: string;
      atIso: string;
    }
  | {
      type: "user_injected";
      slotKey: string;
      labelKo: string;
      valueKo: string;
      atIso: string;
    }
  | {
      type: "system";
      text: string;
      atIso: string;
    };

export type AgentNegotiationSlotKey =
  | "min_price_krw"
  | "max_price_krw"
  | "meet_time_label";

export type AgentSlotQuestion = {
  slotKey: AgentNegotiationSlotKey;
  questionKo: string;
  chips?: readonly string[];
  ownerRole: MarketIntentRole;
};

export type AgentNegotiationProposal = {
  priceKo: string;
  meetTimeKo: string;
  meetPlaceKo: string;
};

export type AgentNegotiationRoomRecord = AgentNegotiationSlotChipContext & {
  handshakeId: string;
  threadId: string | null;
  productTitle: string;
  priceLine: string;
  peerDisplayName: string;
  viewerRole: MarketIntentRole;
  state: AgentNegotiationState;
  log: AgentNegotiationLogEntry[];
  filledSlots: Partial<Record<AgentNegotiationSlotKey, string>>;
  pendingQuestion: AgentSlotQuestion | null;
  proposal: AgentNegotiationProposal | null;
  turnCount: number;
  waitingSinceIso: string | null;
  seekingApprovedAtIso: string | null;
  listingApprovedAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

export type StartAgentNegotiationRoomInput = AgentNegotiationSlotChipContext & {
  handshakeId: string;
  threadId: string | null;
  productTitle: string;
  priceLine: string;
  peerDisplayName: string;
  viewerRole: MarketIntentRole;
};

export const AGENT_NEGOTIATION_MAX_TURNS = 8;
/** Cap server-side ticks per bootstrap — avoids unbounded LLM loops. */
export const AGENT_COORDINATION_BOOTSTRAP_MAX_TICKS = 12;
/** Pause badge after unanswered slot question (30 min). */
export const AGENT_NEGOTIATION_SLOT_TIMEOUT_MS = 30 * 60 * 1000;
