import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

/** Map feedback wire — agent turns must return pins in this shape. */
export type LodgingAgentMapPinType =
  | "eatery"
  | "cafe"
  | "place"
  | "lodging"
  | "info";

export type LodgingAgentMapPinWire = {
  text: string;
  lat: number;
  lng: number;
  type: LodgingAgentMapPinType;
  placeId?: string | null;
  previewImageUrl?: string | null;
};

export type LodgingHostData = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  priceKrw?: number | null;
  partnerLabel?: string | null;
  address?: string | null;
  checkInIso?: string | null;
  checkOutIso?: string | null;
  stayNights?: number | null;
  images: readonly string[];
  mapsUrl?: string | null;
};

export type LodgingContextGhostCandidate = {
  placeId: string;
  label: string;
  axisId: string;
  lat?: number | null;
  lng?: number | null;
};

export type LodgingContextData = {
  contextEventId: string;
  contextTitle: string;
  destinationLabel: string | null;
  budgetBand: string | null;
  lodgingPriority: string | null;
  foodBias: string | null;
  companionMode: string | null;
  travelReasonsKo: readonly string[];
  ghostCandidates: readonly LodgingContextGhostCandidate[];
  userDisplayName: string;
};

export type LodgingAgentRagContext = {
  host: LodgingHostData;
  context: LodgingContextData;
  /** Serialized short-term memory for agent ingress. */
  memoryKo: string;
};

export type LodgingAgentContainer = {
  contextEventId: string;
  lodgingResourceId: string;
  host: LodgingHostData;
  context: LodgingContextData;
  rag: LodgingAgentRagContext;
  systemPrompt: string;
  /** Agent search constraint — default 3 km from host. */
  radiusKm: number;
};

export type LodgingAgentToolName =
  | "find_nearby"
  | "add_to_itinerary"
  | "ask_host";

export type LodgingAgentToolCall = {
  tool: LodgingAgentToolName;
  category?: "cafe" | "eatery" | "place" | "lodging" | null;
  radiusM?: number | null;
  placeId?: string | null;
  question?: string | null;
};

export type LodgingAgentTurnResult = {
  replyText: string;
  mapPins: readonly LodgingAgentMapPinWire[];
  toolCalls: readonly LodgingAgentToolCall[];
  rag: LodgingAgentRagContext;
  systemPrompt: string;
};

export type BuildLodgingAgentContainerInput = {
  event: import("@/lib/events/event-candidate").EventCandidate;
  row: ContextLodgingInventoryRow;
  resourceId: string;
  userDisplayName?: string | null;
  radiusKm?: number;
};
