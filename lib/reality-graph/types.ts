/**
 * Reality Graph — world geo / realtime layer SSOT (catalog + sync projection).
 *
 * NOT:
 * - Reality Surface (UX bands)
 * - Reality Commit / Queue (mutation)
 * - Personal Entity Graph (`lib/ontology` — action recall)
 *
 * Engines (Intent · Research · Planner · Agent) **read** this graph;
 * they never invent Tokyo as a bare string when a WorldGeoEntity exists.
 */

export const REALITY_GRAPH_VERSION = 1 as const;

/** Stable world id — external-geo SSOT, not LLM memory. */
export type WorldGeoEntityId = `geo:${string}`;

export type WorldGeoKind =
  | "world"
  | "continent"
  | "country"
  | "prefecture"
  | "metropolis"
  | "city"
  | "ward"
  | "district"
  | "neighborhood"
  | "poi";

export type WorldGeoLabels = {
  ko: string;
  en: string;
  /** Local script — 東京, 新宿 */
  local?: string;
  aliases?: readonly string[];
};

export type WorldGeoCentroid = {
  lat: number;
  lng: number;
};

/** V1: null. V2: GeoJSON polygon / MultiPolygon. */
export type WorldGeoBoundary = null;

export type WorldGeoNode = {
  id: WorldGeoEntityId;
  kind: WorldGeoKind;
  parentId: WorldGeoEntityId | null;
  labels: WorldGeoLabels;
  centroid: WorldGeoCentroid;
  boundary: WorldGeoBoundary;
  ianaTimeZone: string | null;
  currencyCode: string | null;
  primaryLanguage: string | null;
};

/** Realtime layers projected onto a geo node (Reality Sync). */
export type RealitySyncLayerStatus = "idle" | "pending" | "ok" | "stale" | "error";

export type RealitySyncLayers = {
  gps: RealitySyncLayerStatus;
  map: RealitySyncLayerStatus;
  weather: RealitySyncLayerStatus;
  traffic: RealitySyncLayerStatus;
  time: RealitySyncLayerStatus;
  language: RealitySyncLayerStatus;
  currency: RealitySyncLayerStatus;
  timezone: RealitySyncLayerStatus;
  holiday: RealitySyncLayerStatus;
  season: RealitySyncLayerStatus;
  events: RealitySyncLayerStatus;
  safety: RealitySyncLayerStatus;
  transit: RealitySyncLayerStatus;
};

export type RealitySyncSlice = {
  version: typeof REALITY_GRAPH_VERSION;
  geoId: WorldGeoEntityId;
  asOfIso: string;
  /** Target refresh cadence (ms). Product default 5–10s. */
  refreshIntervalMs: number;
  layers: RealitySyncLayers;
  /** Optional weather snapshot when layer ok. */
  weatherSummaryKo?: string | null;
  localTimeHint?: string | null;
};

export type RealityGraphResolveHit = {
  node: WorldGeoNode;
  /** Root → … → node */
  ancestors: readonly WorldGeoNode[];
  /** node → … → leaves (direct children only in V1) */
  children: readonly WorldGeoNode[];
  matchAlias: string;
  confidence: number;
};

/** World Engine facade — each engine reads Reality Graph only. */
export type WorldEngineId =
  | "location"
  | "geo"
  | "map"
  | "gps"
  | "time"
  | "weather"
  | "transit"
  | "event"
  | "reality_sync"
  | "entity_graph";
