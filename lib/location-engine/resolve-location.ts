/**
 * Location Engine resolve — Reality Graph first, then Nominatim world provider.
 */

import {
  nominatimAutocomplete,
  nominatimGeocode,
  nominatimReverseGeocode,
} from "@/lib/location-engine/providers/nominatim";
import {
  normalizeNominatimHit,
  normalizeRealityGraphCoords,
  normalizeRealityGraphText,
} from "@/lib/location-engine/normalize-to-location-entity";
import type {
  LocationEntity,
  LocationProviderId,
  LocationResolveResult,
} from "@/lib/location-engine/types";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { resolveRunPlaceFromText } from "@/lib/experience-run/resolve-run-place-from-text";

function registryEntityFromText(text: string): LocationEntity | null {
  const domestic = resolveRunPlaceFromText(text);
  if (domestic) {
    const graph = normalizeRealityGraphText(domestic.placeLabel);
    if (graph) {
      return {
        ...graph,
        lat: domestic.lat,
        lng: domestic.lng,
        provider: "registry",
        confidence: Math.max(graph.confidence, 0.9),
      };
    }
    return {
      id: `geo:reg:${domestic.placeLabel}` as `geo:${string}`,
      labelKo: domestic.placeLabel,
      labelEn: domestic.placeLabel,
      lat: domestic.lat,
      lng: domestic.lng,
      formattedAddress: domestic.placeLabel,
      admin: {
        countryCode: "KR",
        countryName: "대한민국",
        region: null,
        city: domestic.placeLabel,
        district: null,
        neighborhood: null,
      },
      hierarchyKo: `대한민국 → ${domestic.placeLabel}`,
      hierarchyEn: `Korea → ${domestic.placeLabel}`,
      timezone: "Asia/Seoul",
      confidence: 0.88,
      provider: "registry",
      providerPlaceId: null,
    };
  }

  const overseas = classifyOverseasManualPlace(text);
  if (overseas) {
    const graph = normalizeRealityGraphText(overseas.label);
    if (graph) {
      return {
        ...graph,
        lat: overseas.lat,
        lng: overseas.lng,
        provider: "registry",
        confidence: Math.max(graph.confidence, 0.92),
      };
    }
    return {
      id: `geo:reg:${overseas.label}` as `geo:${string}`,
      labelKo: overseas.label,
      labelEn: overseas.geocodeQuery.split(",")[0]?.trim() || overseas.label,
      lat: overseas.lat,
      lng: overseas.lng,
      formattedAddress: `${overseas.label}, ${overseas.countryLabel}`,
      admin: {
        countryCode: null,
        countryName: overseas.countryLabel,
        region: null,
        city: overseas.label,
        district: null,
        neighborhood: null,
      },
      hierarchyKo: `${overseas.countryLabel} → ${overseas.label}`,
      hierarchyEn: `${overseas.countryLabel} → ${overseas.label}`,
      timezone: null,
      confidence: 0.9,
      provider: "registry",
      providerPlaceId: null,
    };
  }
  return null;
}

/** Text → Location Entity (World Provider failover). */
export async function resolveLocationFromText(
  text: string,
): Promise<LocationResolveResult | null> {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const tried: LocationProviderId[] = [];

  tried.push("reality_graph");
  const fromGraph = normalizeRealityGraphText(trimmed);
  if (fromGraph) {
    return { entity: fromGraph, providersTried: tried };
  }

  tried.push("registry");
  const fromRegistry = registryEntityFromText(trimmed);
  if (fromRegistry) {
    return { entity: fromRegistry, providersTried: tried };
  }

  tried.push("nominatim");
  const fromNominatim = await nominatimGeocode(trimmed);
  if (fromNominatim) {
    return {
      entity: normalizeNominatimHit(fromNominatim),
      providersTried: tried,
    };
  }

  return null;
}

/** GPS → Location Entity. */
export async function resolveLocationFromCoords(
  lat: number,
  lng: number,
): Promise<LocationResolveResult | null> {
  const tried: LocationProviderId[] = [];

  tried.push("reality_graph");
  const fromGraph = normalizeRealityGraphCoords(lat, lng);
  if (fromGraph && fromGraph.confidence >= 0.75) {
    return { entity: fromGraph, providersTried: tried };
  }

  tried.push("nominatim");
  const fromNominatim = await nominatimReverseGeocode(lat, lng);
  if (fromNominatim) {
    return {
      entity: normalizeNominatimHit(fromNominatim),
      providersTried: tried,
    };
  }

  if (fromGraph) {
    return { entity: fromGraph, providersTried: tried };
  }

  return null;
}

/** Autocomplete prefix → Location Entities. */
export async function suggestLocationsFromText(
  text: string,
  limit = 5,
): Promise<LocationEntity[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const out: LocationEntity[] = [];
  const graph = normalizeRealityGraphText(trimmed);
  if (graph) {
    out.push(graph);
  }
  const reg = registryEntityFromText(trimmed);
  if (reg && !out.some((e) => e.id === reg.id)) {
    out.push(reg);
  }

  if (out.length >= limit) {
    return out.slice(0, limit);
  }

  const hits = await nominatimAutocomplete(trimmed, limit);
  for (const hit of hits) {
    const entity = normalizeNominatimHit(hit);
    if (!out.some((e) => e.id === entity.id || e.labelKo === entity.labelKo)) {
      out.push(entity);
    }
    if (out.length >= limit) {
      break;
    }
  }
  return out.slice(0, limit);
}
