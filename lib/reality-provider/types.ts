/**
 * Reality Provider Runtime — Need → Provider → Acquire → Normalize → Patch.
 * @see docs/adr/051-reality-provider-runtime.md
 */

export const REALITY_NEED_IDS = [
  "rail_network",
  "metro_network",
  "shinkansen_network",
  "poi_set",
  /** Place footprint / castle grounds — OSM polygon glow */
  "poi_geometry",
  "event_set",
  "amenity_set",
] as const;

export type RealityNeedId = (typeof REALITY_NEED_IDS)[number];

export const REALITY_PROVIDER_IDS = [
  "cached_overlay",
  "gtfs",
  "osm",
  "vendor_api",
  "workspace_graph",
] as const;

export type RealityProviderId = (typeof REALITY_PROVIDER_IDS)[number];

export type RealityNeed = {
  readonly needId: RealityNeedId;
  readonly regionKo?: string | null;
  readonly operatorHint?: string | null;
  readonly utterance: string;
  /** show = absorb on · hide = clear projection */
  readonly visibility?: "show" | "hide";
  /** Place name for poi_geometry Acquire */
  readonly placeQuery?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly geoId?: string | null;
};

export type RealityProviderCandidate = {
  readonly providerId: RealityProviderId;
  /** Higher first. */
  readonly priority: number;
  readonly reasonKo: string;
};

export type RealityProviderResolution = {
  readonly need: RealityNeed;
  readonly candidates: readonly RealityProviderCandidate[];
  /** First candidate, or null when none registered for this Need. */
  readonly selected: RealityProviderCandidate | null;
};
