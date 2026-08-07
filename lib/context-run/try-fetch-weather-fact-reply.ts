/**
 * Live weather fact reply — 「오사카 기온 몇도」→ real temp, not chatty small-talk.
 */

import type { WeatherContext } from "@/lib/context-resolver/types";

const WEATHER_FACT_RE =
  /(?:기온|온도|체감\s*온도|몇\s*도|temperature|temp\b|지금\s*날씨|현재\s*날씨|날씨\s*(?:어때|알려|뭐야|어떤))/iu;

/** Place before weather noun, or bare weather ask → use fallback location. */
const PLACE_WEATHER_RE =
  /([가-힣A-Za-z][가-힣A-Za-z\s]{0,20}?)\s*(?:의\s*)?(?:기온|온도|날씨|몇\s*도)/u;

export function looksLikeWeatherFactAsk(utterance: string): boolean {
  const text = utterance.trim();
  if (!text || text.length > 80) return false;
  if (/(?:호텔|숙소|캡슐|맛집|찾아|예약|일정|여행\s*계획)/iu.test(text)) {
    return false;
  }
  return WEATHER_FACT_RE.test(text);
}

export function parseWeatherFactLocation(
  utterance: string,
  fallbackLocationKo?: string | null,
): string {
  const text = utterance.trim();
  const m = text.match(PLACE_WEATHER_RE);
  const fromText = m?.[1]?.trim().replace(/\s+/g, " ") ?? "";
  // Strip fillers like "지금", "오늘"
  const cleaned = fromText
    .replace(/^(?:지금|현재|오늘|내일|이번)\s*/u, "")
    .trim();
  if (cleaned.length >= 2 && !/^(?:기온|온도|날씨|몇)$/u.test(cleaned)) {
    return cleaned;
  }
  return fallbackLocationKo?.trim() || "오사카";
}

export function formatWeatherFactReplyKo(
  weather: WeatherContext,
  locationKo: string,
): string {
  const place =
    weather.location_label?.trim() || locationKo.trim() || "그곳";
  const temp =
    weather.temp_c != null && Number.isFinite(weather.temp_c)
      ? Math.round(weather.temp_c)
      : null;
  const feels =
    weather.feels_like_c != null && Number.isFinite(weather.feels_like_c)
      ? Math.round(weather.feels_like_c)
      : null;
  const cond =
    weather.condition_label?.trim() ||
    weather.summary?.trim() ||
    null;

  if (temp != null) {
    const feelBit =
      feels != null && feels !== temp ? ` · 체감 ${feels}°C` : "";
    const condBit = cond ? ` (${cond})` : "";
    return `지금 ${place} 기온은 약 ${temp}°C예요${feelBit}${condBit}.`;
  }
  if (cond) {
    return `지금 ${place} 날씨는 ${cond} 쪽이에요.`;
  }
  return weather.summary?.trim() || `${place} 날씨를 잠깐 확인할 수 없었어요.`;
}

/**
 * Browser: GET /api/context/weather. Server: fetchWeatherContext direct.
 */
export async function tryFetchWeatherFactReply(input: {
  readonly utterance: string;
  readonly fallbackLocationKo?: string | null;
}): Promise<string | null> {
  if (!looksLikeWeatherFactAsk(input.utterance)) return null;
  const location = parseWeatherFactLocation(
    input.utterance,
    input.fallbackLocationKo,
  );

  try {
    if (typeof window !== "undefined") {
      const res = await fetch(
        `/api/context/weather?location=${encodeURIComponent(location)}`,
      );
      if (!res.ok) return null;
      const weather = (await res.json()) as WeatherContext;
      return formatWeatherFactReplyKo(weather, location);
    }
    const { fetchWeatherContext } = await import(
      "@/lib/context-resolver/weather/fetch-weather-context"
    );
    const weather = await fetchWeatherContext(location);
    return formatWeatherFactReplyKo(weather, location);
  } catch {
    return null;
  }
}
