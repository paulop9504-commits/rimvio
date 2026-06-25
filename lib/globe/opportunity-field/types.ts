import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

/** MVP UserState — GPS · primary focus · now only. */
export type UserStateV1 = {
  lat: number | null;
  lng: number | null;
  gpsFresh: boolean;
  primaryEventId: string | null;
  now: Date;
};

export type OpportunityPill = {
  contextId: string;
  title: string;
  count: number;
  bestScore: number;
  seeking: MarketIntentRecord;
};

export type OpportunityRow = {
  listingId: string;
  listingEventId: string;
  photoUrl: string | null;
  title: string;
  price: number | null;
  priceLine: string;
  conditionLabel: string;
  reasonKo: string;
  scorePct: number;
  fieldScore: number;
  distanceKm: number | null;
  listing: MarketIntentRecord;
  matchReasons: readonly string[];
};

export type OpportunityFieldCopy = {
  reasonBattery: string;
  reasonPrice: string;
  reasonDistance: string;
  reasonRecency: string;
  reasonCondition: string;
  reasonFallback: string;
};
