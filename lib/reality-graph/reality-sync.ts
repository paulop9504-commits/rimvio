import type {
  RealitySyncLayers,
  RealitySyncSlice,
  WorldGeoEntityId,
  WorldGeoNode,
} from "@/lib/reality-graph/types";
import { REALITY_GRAPH_VERSION } from "@/lib/reality-graph/types";
import { getWorldGeoNode } from "@/lib/reality-graph/world-geo-seed";

/** Product cadence for Reality Sync refresh (5–10s). */
export const REALITY_SYNC_INTERVAL_MS = 7_000;

function baseLayers(node: WorldGeoNode): RealitySyncLayers {
  const hasTz = Boolean(node.ianaTimeZone);
  const hasCurrency = Boolean(node.currencyCode);
  const hasLang = Boolean(node.primaryLanguage);
  return {
    gps: "pending",
    map: "pending",
    weather: "pending",
    traffic: "pending",
    time: hasTz ? "ok" : "idle",
    language: hasLang ? "ok" : "idle",
    currency: hasCurrency ? "ok" : "idle",
    timezone: hasTz ? "ok" : "idle",
    holiday: "pending",
    season: "pending",
    events: "pending",
    safety: "pending",
    transit: "pending",
  };
}

/**
 * Reality Sync stub — static locale layers ok; live weather/traffic pending.
 * Callers may refresh every REALITY_SYNC_INTERVAL_MS; no Reality Commit.
 */
export function buildRealitySyncSlice(input: {
  geoId: WorldGeoEntityId;
  asOfIso?: string;
  weatherSummaryKo?: string | null;
  gpsActive?: boolean;
}): RealitySyncSlice | null {
  const node = getWorldGeoNode(input.geoId);
  if (!node) {
    return null;
  }

  const layers = baseLayers(node);
  if (input.gpsActive) {
    layers.gps = "ok";
    layers.map = "ok";
  }
  if (input.weatherSummaryKo?.trim()) {
    layers.weather = "ok";
  }

  let localTimeHint: string | null = null;
  if (node.ianaTimeZone) {
    try {
      localTimeHint = new Intl.DateTimeFormat("ko-KR", {
        timeZone: node.ianaTimeZone,
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(input.asOfIso ?? Date.now()));
    } catch {
      localTimeHint = node.ianaTimeZone;
    }
  }

  return {
    version: REALITY_GRAPH_VERSION,
    geoId: input.geoId,
    asOfIso: input.asOfIso ?? new Date().toISOString(),
    refreshIntervalMs: REALITY_SYNC_INTERVAL_MS,
    layers,
    weatherSummaryKo: input.weatherSummaryKo?.trim() || null,
    localTimeHint,
  };
}
