/**
 * Location Engine — world place understanding OS (not a map SDK wrapper).
 *
 * Providers feed Normalizer → Reality Graph (`geo:*`) / CanonicalPlaceProfile.
 * Downstream Context / Planner must read Location Entity, not raw vendor payloads.
 *
 * @see docs/RIMVIO_LOCATION_ENGINE.md
 */

export type LocationProviderId =
  | "reality_graph"
  | "nominatim"
  | "registry"
  | "kakao"
  | "naver"
  | "google";

export type LocationAdminParts = {
  readonly countryCode: string | null;
  readonly countryName: string | null;
  readonly region: string | null;
  readonly city: string | null;
  readonly district: string | null;
  readonly neighborhood: string | null;
};

/**
 * Normalized location — Rimvio Location Entity projection.
 * Stable id prefers Reality Graph `geo:*`; OSM fallback uses `geo:osm:{placeId}`.
 */
export type LocationEntity = {
  readonly id: `geo:${string}`;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly lat: number;
  readonly lng: number;
  readonly formattedAddress: string | null;
  readonly admin: LocationAdminParts;
  readonly hierarchyKo: string;
  readonly hierarchyEn: string;
  readonly timezone: string | null;
  readonly confidence: number;
  readonly provider: LocationProviderId;
  readonly providerPlaceId: string | null;
};

export type LocationResolveResult = {
  readonly entity: LocationEntity;
  readonly providersTried: readonly LocationProviderId[];
};
