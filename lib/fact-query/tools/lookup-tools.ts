import {
  formatWeatherFactReplyKo,
  looksLikeWeatherFactAsk,
  parseWeatherFactLocation,
} from "@/lib/context-run/try-fetch-weather-fact-reply";
import { cityAnchorById, resolvePlaceAnchor } from "@/lib/fact-query/data/city-anchors";
import type { FactAnswerWire, FactEvidenceItem } from "@/lib/fact-query/types";

export function parseDistanceQuery(utterance: string): {
  fromQuery: string;
  toQuery: string;
} | null {
  const text = utterance.trim();
  const m = text.match(
    /(.+?)(?:에서|부터)\s+(.+?)(?:까지|→)\s*(?:거리|km|킬로|몇\s*km|얼마나|멀|가까)/iu,
  );
  if (!m?.[1] || !m[2]) {
    return null;
  }
  return {
    fromQuery: m[1].trim(),
    toQuery: m[2].trim(),
  };
}

export function looksLikeDistanceAsk(utterance: string): boolean {
  return parseDistanceQuery(utterance) !== null;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function runDistanceLookupTool(utterance: string): FactAnswerWire | null {
  const parsed = parseDistanceQuery(utterance);
  if (!parsed) {
    return null;
  }

  const from = resolvePlaceAnchor(parsed.fromQuery);
  const to = resolvePlaceAnchor(parsed.toQuery);
  if (!from || !to) {
    return null;
  }

  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  const kmLabel = km < 10 ? km.toFixed(1) : String(Math.round(km));

  const evidence: FactEvidenceItem[] = [
    {
      id: `from:${from.id}`,
      labelKo: from.labelKo,
      detailKo: "출발",
      lat: from.lat,
      lng: from.lng,
      kind: "poi",
      score: null,
      source: "city_anchors",
    },
    {
      id: `to:${to.id}`,
      labelKo: to.labelKo,
      detailKo: "도착",
      lat: to.lat,
      lng: to.lng,
      kind: "poi",
      score: null,
      source: "city_anchors",
    },
  ];

  return {
    queryId: `distance:${from.id}:${to.id}`,
    kind: "distance_lookup",
    headlineKo: `${from.labelKo} → ${to.labelKo}: 약 ${kmLabel}km`,
    summaryKo: `직선 거리 약 ${kmLabel}km · 실제 이동은 경로·교통에 따라 달라요.`,
    evidence,
    highlightId: `to:${to.id}`,
    cityLabelKo: null,
    ranTool: true,
    sourceKo: "Rimvio City Anchors · Haversine",
  };
}

export async function runWeatherLookupTool(input: {
  readonly utterance: string;
  readonly fallbackCityId?: string | null;
}): Promise<FactAnswerWire | null> {
  const t = input.utterance.trim();
  const isWeather =
    looksLikeWeatherFactAsk(t) ||
    /(?:오늘|내일|모레).*(?:비|날씨|기온)|(?:비)\s*(?:와|올|오|내)/iu.test(t);
  if (!isWeather) {
    return null;
  }

  const fallback =
    cityAnchorById(input.fallbackCityId ?? "osaka")?.labelKo ?? "오사카";
  const location = parseWeatherFactLocation(input.utterance, fallback);
  const anchor = resolvePlaceAnchor(location) ?? cityAnchorById(input.fallbackCityId ?? "");

  try {
    let weather;
    if (typeof window !== "undefined") {
      const res = await fetch(
        `/api/context/weather?location=${encodeURIComponent(location)}`,
      );
      if (!res.ok) return null;
      weather = await res.json();
    } else {
      const { fetchWeatherContext } = await import(
        "@/lib/context-resolver/weather/fetch-weather-context"
      );
      weather = await fetchWeatherContext(location);
    }

    const summary = formatWeatherFactReplyKo(weather, location);
    const temp =
      weather.temp_c != null && Number.isFinite(weather.temp_c)
        ? Math.round(weather.temp_c)
        : null;

    const lat = anchor?.lat ?? 34.6937;
    const lng = anchor?.lng ?? 135.5023;

    return {
      queryId: `weather:${location}`,
      kind: "weather_lookup",
      headlineKo: temp != null ? `${location} · ${temp}°C` : `${location} 날씨`,
      summaryKo: summary,
      evidence: [
        {
          id: `weather:${location}`,
          labelKo: location,
          detailKo: weather.condition_label ?? weather.summary ?? null,
          lat,
          lng,
          kind: "highlight",
          score: temp,
          source: "live_weather_api",
        },
      ],
      highlightId: `weather:${location}`,
      cityLabelKo: location,
      ranTool: true,
      sourceKo: "Live Weather API",
    };
  } catch {
    return null;
  }
}
