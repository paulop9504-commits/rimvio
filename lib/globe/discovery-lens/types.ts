/** 1st-person POV — WHERE discovery runs (not the context file). */

import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

export const DISCOVERY_LENS_IDS = ["a", "b", "c"] as const;
export type DiscoveryLensId = (typeof DISCOVERY_LENS_IDS)[number];

export type LensPrefetchStatus = "loading" | "ready" | "empty";

export type LensPrefetchItem = {
  readonly kind: "lodging" | "eatery" | "activity" | "amenity";
  readonly activitySubtype?: LocalDiscoveryActivitySubtype | null;
  readonly placeId: string;
  readonly title: string;
  readonly reasonKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly thumbnailUrl?: string | null;
  readonly priceKrw?: number | null;
  readonly rating?: number | null;
  readonly mapsUrl?: string | null;
  readonly openNow?: boolean | null;
};

export type LensPrefetchBundle = {
  readonly status: LensPrefetchStatus;
  readonly updatedAtIso: string;
  readonly items: readonly LensPrefetchItem[];
};

export type DiscoveryLensCenter = {
  readonly lat: number;
  readonly lng: number;
};

export type DiscoveryLens = {
  readonly id: DiscoveryLensId;
  readonly labelKo: string;
  readonly center: DiscoveryLensCenter;
  /** Search + map ring radius in meters. */
  readonly radiusM: number;
  readonly spawnedFrom?: string | null;
  readonly prefetch?: LensPrefetchBundle;
};

export type DiscoveryLensSession = {
  readonly contextEventId: string;
  readonly lenses: readonly DiscoveryLens[];
  readonly activeLensId: DiscoveryLensId | null;
  readonly updatedAtIso: string;
  /** When set, next domain search should pick a lens first. */
  readonly awaitingLensPick?: boolean;
  readonly pendingSearchKind?: "lodging" | "eatery" | "activity" | "amenity" | null;
};

export type DiscoverySearchOrigin = {
  readonly lat: number;
  readonly lng: number;
  readonly regionLabel: string;
  readonly radiusM: number;
  readonly lensId: DiscoveryLensId | null;
};

export function readActiveDiscoveryLens(
  session: DiscoveryLensSession | null | undefined,
): DiscoveryLens | null {
  if (!session?.activeLensId) {
    return null;
  }
  return session.lenses.find((row) => row.id === session.activeLensId) ?? null;
}

export function discoveryOriginFromLens(lens: DiscoveryLens): DiscoverySearchOrigin {
  return {
    lat: lens.center.lat,
    lng: lens.center.lng,
    regionLabel: lens.labelKo,
    radiusM: lens.radiusM,
    lensId: lens.id,
  };
}
