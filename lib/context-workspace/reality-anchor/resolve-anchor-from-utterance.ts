/**
 * Reality Anchor from utterance — world-geo SSOT (not chat invent).
 * Catalog miss → Osaka Metro stations → Nominatim / Location Engine.
 * @see docs/RIMVIO_REALITY_ANCHOR_PROJECTION.md
 */

import {
  getWorldGeoNode,
  resolveWorldGeoEntity,
  type WorldGeoEntityId,
} from "@/lib/reality-graph";
import { resolveOsakaMetroStationFromText } from "@/lib/geo/osaka-metro/station-catalog";
import { resolveLocationFromText } from "@/lib/location-engine";

export const USJ_GEO_ID = "geo:jp:osaka:usj" as const satisfies WorldGeoEntityId;

/** USJ / Universal Studios aliases (both 유니버설 · 유니버셜). */
export const USJ_ANCHOR_RE =
  /USJ|유니버설|유니버셜|universal\s*studios?/iu;

export type RealityAnchorHit = {
  readonly geoId: string;
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly kind: "poi" | "station" | "area" | "city";
  /** Where coords came from — catalog · metro · world geocode */
  readonly provider?: "world_geo" | "osaka_metro" | "nominatim" | "registry";
};

export function isNearLodgingUtterance(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /근처|주변|near|around|기준/iu.test(t) &&
    /숙소|호텔|hotel|lodging|캡슐|료칸/iu.test(t)
  );
}

/** Pull place label: 「모리노미아역 근처 호텔」→ 모리노미아역 */
export function extractNearPlaceLabelFromUtterance(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const station = t.match(/([가-힣A-Za-z0-9·]+역)/u)?.[1];
  if (station) return station;
  const near = t.match(
    /([가-힣A-Za-z0-9·\s]{2,24}?)\s*(?:근처|주변|앞|near|around)/iu,
  )?.[1];
  if (near) {
    return near
      .replace(/^(?:의|이|그|저)\s*/u, "")
      .replace(/\s*(?:호텔|숙소|맛집|카페).*$/u, "")
      .trim();
  }
  return t;
}

function osakaMetroAnchorHit(text: string): RealityAnchorHit | null {
  const station = resolveOsakaMetroStationFromText(text);
  if (!station) return null;
  return {
    geoId: `geo:jp:osaka:metro:${station.id}`,
    labelKo: `${station.nameKo}역`,
    lat: station.lat,
    lng: station.lng,
    kind: "station",
    provider: "osaka_metro",
  };
}

/**
 * Resolve named Reality Anchor from NL via world-geo catalog (+ Osaka Metro).
 */
export function resolveRealityAnchorFromUtterance(
  text: string,
): RealityAnchorHit | null {
  const t = text.trim();
  if (!t) return null;

  const hit = resolveWorldGeoEntity(t);
  if (
    hit?.node &&
    Number.isFinite(hit.node.centroid.lat) &&
    Number.isFinite(hit.node.centroid.lng)
  ) {
    return {
      geoId: hit.node.id,
      labelKo: hit.node.labels.ko,
      lat: hit.node.centroid.lat,
      lng: hit.node.centroid.lng,
      kind:
        hit.node.kind === "poi"
          ? "poi"
          : hit.node.kind === "city"
            ? "city"
            : "area",
      provider: "world_geo",
    };
  }

  // Explicit USJ fallback if resolver spelling missed
  if (USJ_ANCHOR_RE.test(t)) {
    const node = getWorldGeoNode(USJ_GEO_ID);
    if (node) {
      return {
        geoId: node.id,
        labelKo: node.labels.ko,
        lat: node.centroid.lat,
        lng: node.centroid.lng,
        kind: "poi",
        provider: "world_geo",
      };
    }
  }

  // Local Osaka Metro station dict — covers 「모리노미아역」etc. without network.
  const metro = osakaMetroAnchorHit(t);
  if (metro) return metro;

  return null;
}

function buildGeocodeQueryCandidates(label: string, utterance: string): string[] {
  const base = label.trim();
  if (!base) return [];
  const out: string[] = [base];
  const stationCore = base.replace(/(?:역|駅|station)$/iu, "").trim();
  const looksJpTourist =
    /오사카|大阪|osaka|도쿄|東京|교토|京都|japan|일본/iu.test(utterance) ||
    /역$/u.test(base) ||
    Boolean(resolveOsakaMetroStationFromText(base));

  if (looksJpTourist || /[가-힣]/u.test(stationCore)) {
    out.push(`${stationCore} Station Osaka Japan`);
    out.push(`${stationCore}駅 大阪`);
    out.push(`${base} 大阪`);
  }
  return [...new Set(out.map((q) => q.trim()).filter(Boolean))];
}

/**
 * Catalog miss → Osaka Metro → Nominatim / Location Engine (world search).
 * Use on Agent Loop spatial_constraint so unknown places still pin Reality.
 */
export async function resolveRealityAnchorFromUtteranceAsync(
  text: string,
): Promise<RealityAnchorHit | null> {
  const sync = resolveRealityAnchorFromUtterance(text);
  if (sync) return sync;

  const label = extractNearPlaceLabelFromUtterance(text) || text.trim();
  if (!label) return null;

  const metro = osakaMetroAnchorHit(label);
  if (metro) return metro;

  const queries = buildGeocodeQueryCandidates(label, text);
  for (const query of queries) {
    try {
      const resolved = await resolveLocationFromText(query);
      const entity = resolved?.entity;
      if (
        !entity ||
        !Number.isFinite(entity.lat) ||
        !Number.isFinite(entity.lng)
      ) {
        continue;
      }
      const kind: RealityAnchorHit["kind"] =
        /역|駅|station/iu.test(label) || /station/iu.test(entity.labelEn)
          ? "station"
          : entity.admin.city
            ? "area"
            : "poi";
      return {
        geoId:
          entity.id ||
          `geo:geocode:${entity.lat.toFixed(5)},${entity.lng.toFixed(5)}`,
        labelKo: entity.labelKo || label,
        lat: entity.lat,
        lng: entity.lng,
        kind,
        provider:
          entity.provider === "registry" ? "registry" : "nominatim",
      };
    } catch {
      /* try next query */
    }
  }

  return null;
}

/** Cold-start travel Continuum seed utterance (forces travel kind classify). */
export function buildAnchorLodgingContinuumUtterance(
  utterance: string,
  anchor: RealityAnchorHit,
): string {
  const base = utterance.trim();
  if (/여행|트립|trip/iu.test(base)) return base;
  return `${anchor.labelKo} 여행 · ${base}`;
}
