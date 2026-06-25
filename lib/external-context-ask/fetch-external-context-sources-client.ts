import { fetchExternalGlobeTracesNear } from "@/lib/globe/fetch-external-globe-traces-near";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { ExternalContextSources } from "@/lib/external-context-ask/external-context-opportunity-types";
import { fetchAlignmentChatsRemote } from "@/lib/peer-chat/fetch-alignment-chats-client";

const DEFAULT_MARKET_RADIUS_KM = 15;

async function fetchMarketDiscoveryIntents(input: {
  lat?: number | null;
  lng?: number | null;
  signal?: AbortSignal;
}): Promise<MarketIntentRecord[]> {
  const params = new URLSearchParams();
  if (input.lat != null && input.lng != null) {
    params.set("lat", String(input.lat));
    params.set("lng", String(input.lng));
  }
  params.set("radiusKm", String(DEFAULT_MARKET_RADIUS_KM));

  const response = await fetch(
    `/api/globe/market-intent/discovery?${params.toString()}`,
    { signal: input.signal, cache: "no-store" },
  );
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as { intents?: MarketIntentRecord[] };
  return Array.isArray(body.intents) ? body.intents : [];
}

/** Client fetch — public bridges only (market · traces · alignment threads). */
export async function fetchExternalContextSourcesClient(input: {
  lat?: number | null;
  lng?: number | null;
  signal?: AbortSignal;
}): Promise<ExternalContextSources> {
  const hasCoords =
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng);

  const [alignmentResult, marketIntents, traces] = await Promise.all([
    fetchAlignmentChatsRemote().catch(() => ({ items: [] })),
    fetchMarketDiscoveryIntents(input).catch(() => []),
    hasCoords
      ? fetchExternalGlobeTracesNear({
          lat: input.lat!,
          lng: input.lng!,
          signal: input.signal,
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  return {
    alignmentChats: alignmentResult.items,
    marketIntents,
    traces,
  };
}
