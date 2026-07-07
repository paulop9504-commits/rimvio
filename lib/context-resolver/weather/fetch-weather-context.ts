import {
  fallbackWeatherContext,
  normalizeOpenWeatherResponse,
  type OpenWeatherResponse,
} from "@/lib/context-resolver/weather/normalize-weather";
import { fetchCurrentWeatherOpenMeteo } from "@/lib/context-resolver/weather/fetch-current-weather-open-meteo";
import type { WeatherContext } from "@/lib/context-resolver/types";

const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

export function openWeatherApiKey() {
  return process.env.OPENWEATHER_API_KEY?.trim() ?? "";
}

export function isOpenWeatherConfigured() {
  return Boolean(openWeatherApiKey());
}

/**
 * Server-side weather fetch. Prefers OpenWeather (city-name query) when a key is
 * configured; otherwise falls back to keyless Open-Meteo (real data, no key) and
 * only then to the static time-of-day heuristic.
 */
export async function fetchWeatherContext(location: string): Promise<WeatherContext> {
  const query = location.trim();
  if (!query) {
    return fallbackWeatherContext("현재 위치");
  }

  const apiKey = openWeatherApiKey();
  if (!apiKey) {
    const openMeteo = await fetchCurrentWeatherOpenMeteo(query);
    return openMeteo ?? fallbackWeatherContext(query);
  }

  try {
    const url = `${OPENWEATHER_URL}?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric&lang=kr`;
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) {
      const openMeteo = await fetchCurrentWeatherOpenMeteo(query);
      return openMeteo ?? fallbackWeatherContext(query);
    }

    const data = (await response.json()) as OpenWeatherResponse;
    return normalizeOpenWeatherResponse(data, query);
  } catch {
    const openMeteo = await fetchCurrentWeatherOpenMeteo(query);
    return openMeteo ?? fallbackWeatherContext(query);
  }
}
