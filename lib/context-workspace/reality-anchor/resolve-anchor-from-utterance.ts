/**
 * Reality Anchor from utterance — world-geo SSOT (not chat invent).
 * @see docs/RIMVIO_REALITY_ANCHOR_PROJECTION.md
 */

import {
  getWorldGeoNode,
  resolveWorldGeoEntity,
  type WorldGeoEntityId,
} from "@/lib/reality-graph";

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
};

export function isNearLodgingUtterance(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /근처|주변|near|around|기준/iu.test(t) &&
    /숙소|호텔|hotel|lodging|캡슐|료칸/iu.test(t)
  );
}

/**
 * Resolve named Reality Anchor from NL via world-geo catalog.
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
      };
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
