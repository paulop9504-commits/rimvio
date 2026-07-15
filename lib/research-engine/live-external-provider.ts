/**
 * Fast Scan from live external SSOT — Places · LiteAPI · (optional) geocode.
 * Runs even when scout inventory / discovery batch is empty.
 */

import type { FastScanCandidate } from "@/engines/research/schema";
import { resolveDiscoveryOriginFromUtterance } from "@/lib/globe/context-condition-ai/resolve-discovery-origin-from-utterance";
import {
  fetchLiveResearchInventory,
  resolveLiveResearchAnchor,
  resolveResearchLiveSurfaces,
  type LiveInventoryRow,
} from "@/lib/research-engine/live-external-ssot";
import {
  candidatesFromInventorySnippets,
  type ResearchCandidateProvider,
} from "@/lib/research-engine/providers";

function domainForSurface(surface: LiveInventoryRow["surface"]): string {
  switch (surface) {
    case "eatery":
      return "live.eatery.rimvio";
    case "activity":
      return "live.activity.rimvio";
    case "amenity":
      return "live.amenity.rimvio";
    default:
      return "live.lodging.rimvio";
  }
}

function mapLiveRows(rows: readonly LiveInventoryRow[]): FastScanCandidate[] {
  return candidatesFromInventorySnippets(
    rows.map((row, index) => ({
      id: row.placeId?.trim() || `live-${row.surface}-${index}`,
      title: row.name?.trim() || `후보 ${index + 1}`,
      snippet: [
        row.address?.trim(),
        row.source === "liteapi" ? "LiteAPI 요금" : "Places 관측",
        row.reviewCount != null ? `리뷰 ${row.reviewCount}` : null,
        row.rating != null ? `★${row.rating.toFixed(1)}` : null,
        row.priceKrw != null
          ? `1박 약 ${Math.round(row.priceKrw / 10_000)}만`
          : null,
        row.youtubeConfidence != null
          ? `영상 ${(row.youtubeConfidence * 100).toFixed(0)}%`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      domain: domainForSurface(row.surface),
      kind: row.surface,
      priceKrw: row.priceKrw ?? null,
      rating: row.rating ?? null,
      reviewCount: row.reviewCount ?? null,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
    })),
  ).map((candidate, index) => {
    const row = rows[index];
    if (!row) return candidate;
    return {
      ...candidate,
      metadata: {
        ...candidate.metadata,
        liveSsot: true,
        liveSource: row.source,
        youtubeConfidence: row.youtubeConfidence ?? null,
        videoTitle: row.videoTitle ?? null,
      },
    };
  });
}

function geocodeQueryFromMessage(message: string, regionLabel?: string | null): string {
  if (regionLabel?.trim()) return regionLabel.trim().slice(0, 40);
  return message
    .replace(
      /(?:어디(?:가|가\s*)?(?:좋|나을|추천)|추천해|비교해|골라줘|조사해|리서치|하루\s*\d+\s*만|만원대)/giu,
      " ",
    )
    .replace(/(?:호텔|숙소|맛집|식당|놀거리)/giu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export function createLiveExternalCandidateProvider(input: {
  message: string;
  lat?: number | null;
  lng?: number | null;
  regionLabel?: string | null;
  fetchImpl?: typeof fetch;
  /** Soft YT on top lodging (default true once). */
  enrichYt?: boolean;
}): ResearchCandidateProvider {
  return {
    id: "live_external",
    async listCandidates(listInput) {
      const message = input.message.trim() || listInput.queries.join(" ");
      const hasInputCoords =
        input.lat != null &&
        input.lng != null &&
        Number.isFinite(input.lat) &&
        Number.isFinite(input.lng);

      const fallbackOrigin = hasInputCoords
        ? {
            lat: input.lat!,
            lng: input.lng!,
            regionLabel: input.regionLabel ?? "",
            radiusM: 3000,
            lensId: null,
          }
        : null;

      const fromUtterance = resolveDiscoveryOriginFromUtterance(
        message,
        fallbackOrigin,
      );

      let lat = hasInputCoords ? input.lat! : (fromUtterance?.lat ?? null);
      let lng = hasInputCoords ? input.lng! : (fromUtterance?.lng ?? null);

      if (lat == null || lng == null) {
        const geo = await resolveLiveResearchAnchor({
          query: geocodeQueryFromMessage(
            message,
            fromUtterance?.regionLabel ?? input.regionLabel,
          ),
          fetchImpl: input.fetchImpl,
        });
        if (!geo) {
          return [] as FastScanCandidate[];
        }
        lat = geo.lat;
        lng = geo.lng;
      }

      const surfaces = resolveResearchLiveSurfaces(message);
      const rows = await fetchLiveResearchInventory({
        lat,
        lng,
        message,
        surfaces,
        maxPerSurface: Math.min(8, listInput.limit ?? 8),
        fetchImpl: input.fetchImpl,
        enrichYt: input.enrichYt !== false,
      });
      if (rows.length === 0) {
        return [] as FastScanCandidate[];
      }
      return mapLiveRows(rows).slice(0, listInput.limit ?? 24);
    },
  };
}
