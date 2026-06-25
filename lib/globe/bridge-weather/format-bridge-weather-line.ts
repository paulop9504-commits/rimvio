import type { BridgeWeatherRecord } from "@/lib/globe/bridge-weather/bridge-weather-types";

/** L1 one-liner — experience-time weather for bridge context. */
export function formatBridgeWeatherLine(
  weather: BridgeWeatherRecord | null | undefined,
): string | null {
  if (!weather) {
    return null;
  }
  const temp = Number.isFinite(weather.temperature)
    ? `${weather.temperature}°C`
    : null;
  const parts = [weather.condition.trim(), temp].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
