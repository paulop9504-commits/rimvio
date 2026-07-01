/** Per-resource monitoring — Field dashboard subscribes; chat does not create resources. */
export type ResourceInquirySummary = {
  handshakeId: string;
  threadId: string | null;
  statusHeadlineKo: string;
  counterpartyLabelKo: string;
};

export type ResourceMatchedPerson = {
  matchIntentId: string;
  matchEventId: string;
  displayNameKo: string;
  distanceKm: number;
  interestHintKo: string;
  handshakeId?: string | null;
  threadId?: string | null;
};

export type ResourceVisibility = {
  innerGlobe: boolean;
  outerGlobe: boolean;
};

export type ResourceStatus = {
  resourceId: string;
  eventId: string;
  productTitleKo: string;
  priceLineKo: string;
  aiActivity: {
    views: number;
    inquiries: ResourceInquirySummary[];
    matchedCandidates: ResourceMatchedPerson[];
  };
  visibility: ResourceVisibility;
  anchorLat: number;
  anchorLng: number;
};
