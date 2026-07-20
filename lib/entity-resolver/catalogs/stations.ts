/**
 * Station dictionary — Dictionary-first NER with Reality Graph geoId.
 * Coords live in world-geo-seed / frequent-travel-geo; this wires Station kind.
 */
import type { EntityCatalogEntry } from "@/lib/entity-resolver/catalogs/catalog-types";
import { STATION_SEMANTIC_PATH } from "@/lib/entity-resolver/semantic-layer";
import { FREQUENT_STATION_GEO_IDS } from "@/lib/reality-graph/frequent-travel-geo";
import { getWorldGeoNode } from "@/lib/reality-graph/world-geo-seed";
import type { WorldGeoEntityId } from "@/lib/reality-graph/types";

const CORE_STATION_GEO_IDS: readonly WorldGeoEntityId[] = [
  "geo:jp:tokyo:tokyo-station",
  "geo:jp:osaka:namba-station",
  "geo:jp:osaka:umeda-station",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stationPattern(aliases: readonly string[]): RegExp {
  const parts = [...new Set(aliases.map((a) => a.trim()).filter((a) => a.length >= 2))]
    .sort((a, b) => b.length - a.length)
    .map((alias) => {
      const spaced = escapeRegExp(alias).replace(/\s+/g, "\\s*");
      return spaced;
    });
  return new RegExp(`(?:${parts.join("|")})`, "iu");
}

function entryFromGeoId(geoId: WorldGeoEntityId): EntityCatalogEntry | null {
  const node = getWorldGeoNode(geoId);
  if (!node) {
    return null;
  }
  const aliases = [
    node.labels.ko,
    node.labels.en,
    node.labels.local ?? "",
    ...(node.labels.aliases ?? []),
  ].filter(Boolean);
  const isAirport = /공항|airport|空港/iu.test(aliases.join(" "));
  if (isAirport) {
    return null;
  }
  return {
    id: `station:${geoId.replace(/^geo:/, "")}`,
    labelKo: node.labels.ko,
    queryKo: node.labels.ko,
    kind: "Station",
    pattern: stationPattern(aliases),
    aliases,
    semanticPath: [...STATION_SEMANTIC_PATH],
    geoId,
    confidence: 0.94,
  };
}

const ALL_STATION_IDS = [
  ...CORE_STATION_GEO_IDS,
  ...FREQUENT_STATION_GEO_IDS.filter(
    (id) => !CORE_STATION_GEO_IDS.includes(id),
  ),
];

export const STATION_CATALOG: readonly EntityCatalogEntry[] = ALL_STATION_IDS.map(
  entryFromGeoId,
).filter((row): row is EntityCatalogEntry => row != null);
