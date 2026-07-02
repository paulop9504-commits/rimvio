export type PersonalContextQueryIntent =
  | "last_meet_place"
  | "schedule_week"
  | "travel_recall"
  | "place_with_person"
  | "frequent_person"
  | "bridge_context"
  | "photo_recall"
  | "sell_price_recall"
  | "market_trade_recall"
  | "general";

export type PersonalContextQueryTarget = "photo" | "general";

export type PersonalContextResponseFocus =
  | "photos"
  | "when"
  | "activity"
  | "general";

export type ParsedPersonalContextQuery = {
  raw: string;
  intent: PersonalContextQueryIntent;
  target: PersonalContextQueryTarget;
  responseFocus: PersonalContextResponseFocus;
  personNeedles: readonly string[];
  placeNeedles: readonly string[];
  productNeedles: readonly string[];
  year: number | null;
  weekOffset: 0 | 1 | null;
  foodRelated: boolean;
};

export type PersonalContextPhotoPreview = {
  id: string;
  imageUrl: string | null;
  mediaContextId: string | null;
  allowLocalBlob: boolean;
  capturedAtIso: string | null;
  kind: "photo" | "video";
};

export type PersonalContextBridgeHit = {
  eventId: string;
  title: string;
  headline: string;
  place: string | null;
  atIso: string | null;
  people: readonly string[];
  reasonKo: string;
  photoCount: number;
  dwellDays: number | null;
  photoPreviews: readonly PersonalContextPhotoPreview[];
  contextKind: string | null;
  spotLabels: readonly string[];
  periodEndIso: string | null;
  marketProductName?: string | null;
  marketPriceLine?: string | null;
  marketRealizedPriceKrw?: number | null;
  marketRole?: "seeking" | "listing" | null;
};

export type PersonalContextAskRecallContext = {
  relationshipLine: string | null;
  relationshipAnchor: string | null;
  weatherLine: string | null;
  weatherTemperature: number | null;
  coExperienceCount: number;
  peerThreadId: string | null;
  contextTalkThreadId: string | null;
};

export type PersonalContextAskKind =
  | "bridges"
  | "schedule"
  | "empty"
  | "external_soon";

export type PersonalContextAskResult = {
  kind: PersonalContextAskKind;
  intent: PersonalContextQueryIntent;
  hits: readonly PersonalContextBridgeHit[];
  /** Multi-paragraph AI narrative. */
  narrativeKo: string;
  /** First paragraph — compact line. */
  summaryKo: string;
  totalPhotoCount: number;
  responseFocus: PersonalContextResponseFocus;
  /** Hit used for inline photo / context restore in ask sheet. */
  featuredHitId: string | null;
  recallContext: PersonalContextAskRecallContext | null;
};
