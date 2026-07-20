/**
 * Reality Object Card — tab model for Globe (Info · Gallery · Nearby · Execution).
 * L1 labels live in human-ko; these ids are L3 only.
 */

import type { RealityExecutionCapability } from "@/lib/reality-object/types";

export const OBJECT_CARD_TABS = [
  "information",
  "gallery",
  "nearby",
  "execution",
] as const;

export type ObjectCardTabId = (typeof OBJECT_CARD_TABS)[number];

export type ObjectCardFact = {
  readonly id: string;
  readonly labelKo: string;
};

export type ObjectCardNearbyRow = {
  readonly id: string;
  readonly label: string;
  readonly pinKind: "eatery" | "lodging" | "activity" | "amenity";
  readonly score?: number;
};

export type ObjectCardModelV1 = {
  readonly title: string;
  readonly objectTypeLabelKo: string;
  readonly coverImageUrl: string | null;
  readonly ratingLabel: string | null;
  readonly facts: readonly ObjectCardFact[];
  readonly galleryUrls: readonly string[];
  readonly nearby: readonly ObjectCardNearbyRow[];
  readonly capabilities: readonly RealityExecutionCapability[];
  readonly executionReady: boolean;
  readonly defaultTab: ObjectCardTabId;
};
