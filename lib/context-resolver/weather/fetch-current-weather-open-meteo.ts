import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import {
  openMeteoWeatherCodeLabelKo,
  openMeteoWeatherCodeToCondition,
} from "@/lib/context-resolver/weather/open-meteo-weather-code";
import type { WeatherContext } from "@/lib/context-resolver/types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

type OpenMeteoCurrent = {
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  weather_code?: number;
  precipitation?: number;
};

type OpenMeteoForecastResponse = {
  current?: OpenMeteoCurrent;
};

/**
 * Keyless real-time weather via Open-Meteo (same provider as our historical
 * archive path). Resolves a place label to approximate coordinates, so it works
 * without OPENWEATHER_API_KEY. Returns null on any failure so callers can fall
 * back to the static heuristic.
 */
export async function fetchCurrentWeatherOpenMeteo(
  location: string,
): Promise<WeatherContext | null> {
  const query = location.trim();
  if (!query) {
    return null;
  }

  const coords = resolvePlaceCoordinates(query);
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lng),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,precipitation",
    timezone: "auto",
  });

  try {
    const response = await fetch(`${FORECAST_URL}?${params.toString()}`, {
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenMeteoForecastResponse;
    const current = data.current;
    if (!current || typeof current.temperature_2m !== "number") {
      return null;
    }

    const code = typeof current.weather_code === "number" ? current.weather_code : 3;
    const condition = openMeteoWeatherCodeToCondition(code);
    const label = openMeteoWeatherCodeLabelKo(code);
    const tempC = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature ?? current.temperature_2m);
    const humidity = current.relative_humidity_2m;
    const precip = current.precipitation ?? 0;
    const rainy = condition === "rain" || precip > 0.1;
    const isUnpleasant = tempC > 30 || feelsLike > 32 || rainy || condition === "snow";

    return {
      condition: rainy && condition !== "snow" ? "rain" : condition,
      condition_label: label,
      summary: label,
      temp_c: tempC,
      feels_like_c: feelsLike,
      humidity_pct: typeof humidity === "number" ? Math.round(humidity) : undefined,
      precipitation_chance: rainy ? 0.8 : condition === "clear" ? 0.1 : 0.35,
      is_unpleasant: isUnpleasant,
      location_label: coords.label || query,
    };
  } catch {
    return null;
  }
}
