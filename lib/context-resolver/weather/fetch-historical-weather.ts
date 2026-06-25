import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import {
  openMeteoWeatherCodeLabelKo,
  openMeteoWeatherCodeToCondition,
} from "@/lib/context-resolver/weather/open-meteo-weather-code";
import type { WeatherContext } from "@/lib/context-resolver/types";

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

export type HistoricalWeatherSnapshot = WeatherContext & {
  target_at: string;
  high_c: number;
  low_c: number;
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pickHourIndex(times: string[], targetMs: number): number {
  let bestIndex = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let index = 0; index < times.length; index += 1) {
    const ms = Date.parse(times[index] ?? "");
    if (Number.isNaN(ms)) {
      continue;
    }
    const diff = Math.abs(ms - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  }
  return bestIndex;
}

/** Historical weather at experience instant — Open-Meteo archive (no API key). */
export async function fetchHistoricalWeatherAt(input: {
  location: string;
  targetAt: Date;
}): Promise<HistoricalWeatherSnapshot | null> {
  const location = input.location.trim();
  const targetAt = input.targetAt;
  if (!location || Number.isNaN(targetAt.getTime())) {
    return null;
  }

  const coords = resolvePlaceCoordinates(location);
  const dateKey = toDateKey(targetAt);
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lng),
    start_date: dateKey,
    end_date: dateKey,
    hourly: "temperature_2m,weathercode",
    daily: "temperature_2m_max,temperature_2m_min,weathercode",
    timezone: "auto",
  });

  try {
    const response = await fetch(`${ARCHIVE_URL}?${params.toString()}`, {
      next: { revalidate: 86_400 },
    });
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        weathercode?: number[];
      };
      daily?: {
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        weathercode?: number[];
      };
    };

    const hourlyTimes = data.hourly?.time ?? [];
    const hourIndex = pickHourIndex(hourlyTimes, targetAt.getTime());
    const tempRaw = data.hourly?.temperature_2m?.[hourIndex];
    const codeRaw =
      data.hourly?.weathercode?.[hourIndex] ??
      data.daily?.weathercode?.[0] ??
      3;
    const highRaw = data.daily?.temperature_2m_max?.[0] ?? tempRaw ?? 10;
    const lowRaw = data.daily?.temperature_2m_min?.[0] ?? tempRaw ?? 5;
    const tempC = Math.round(tempRaw ?? highRaw);
    const highC = Math.round(highRaw);
    const lowC = Math.round(lowRaw);
    const code = typeof codeRaw === "number" ? codeRaw : 3;
    const label = openMeteoWeatherCodeLabelKo(code);
    const condition = openMeteoWeatherCodeToCondition(code);

    return {
      condition,
      condition_label: label,
      summary: label,
      temp_c: tempC,
      feels_like_c: tempC,
      location_label: coords.label || location,
      target_at: targetAt.toISOString(),
      high_c: highC,
      low_c: lowC,
    };
  } catch {
    return null;
  }
}
