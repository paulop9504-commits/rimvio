import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import { parseFindPlaceIntent } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import type { CafeDiscoveryWire } from "@/lib/context-resolver/places/types";
import { projectPlaceDiscoveryPinClusters } from "@/lib/globe/opportunity-field/project-place-discovery-pin-cluster";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

export type FieldPlacePinMeta = {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  reason: string;
};

export type FieldPlaceDiscoveryResult = {
  ok: boolean;
  query: string;
  summary?: string;
  thought?: string;
  cafeDiscovery?: CafeDiscoveryWire | null;
  placePins?: FieldPlacePinMeta[];
  pinClusters?: PinCluster[];
  error?: string;
};

export function normalizeFieldPlaceSearchQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "근처 맛집 추천";
  }
  const enriched = enrichPlaceDiscoveryMessage(trimmed);
  if (parseFindPlaceIntent(enriched)) {
    return enriched;
  }
  return enriched;
}

export function parseFieldPlaceCoord(raw: string | null | undefined): number | null {
  if (!raw?.trim()) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Shared Field + dev place discovery — GPS origin optional. */
export async function runFieldPlaceDiscoverySearch(input: {
  query: string;
  lat?: number | null;
  lng?: number | null;
  includeThought?: boolean;
}): Promise<FieldPlaceDiscoveryResult> {
  const q = normalizeFieldPlaceSearchQuery(input.query);
  const origin =
    input.lat != null && input.lng != null
      ? { lat: input.lat, lng: input.lng }
      : undefined;

  const result = await orchestratePlaceRecommendation(q, { origin });

  if (!result) {
    return {
      ok: false,
      query: q,
      error: "맛집 검색 의도로 인식하지 못했어요.",
    };
  }

  const placePins = Array.isArray(result.metadata?.place_pins)
    ? (result.metadata.place_pins as FieldPlacePinMeta[])
    : [];
  const pinClusters = projectPlaceDiscoveryPinClusters(placePins);

  return {
    ok: true,
    query: q,
    summary: result.summary,
    thought: input.includeThought ? result.thought : undefined,
    cafeDiscovery: result.cafeDiscovery ?? null,
    placePins,
    pinClusters,
  };
}
