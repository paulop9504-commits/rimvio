import type { WeatherContext } from "@/lib/context-resolver/types";
import { fetchHistoricalWeatherAt } from "@/lib/context-resolver/weather/fetch-historical-weather";
import { fetchWeatherForecastAt } from "@/lib/context-resolver/weather/fetch-weather-forecast";
import type {
  BridgeEventTimeSource,
  BridgeWeatherRecord,
  BridgeWeatherSource,
} from "@/lib/globe/bridge-weather/bridge-weather-types";

const PAST_THRESHOLD_MS = 2 * 60 * 60 * 1000;

function weatherSourceForTarget(
  targetAt: Date,
  nowMs: number,
  fetched: "historical" | "forecast" | "current",
): BridgeWeatherSource {
  if (fetched === "historical") {
    return "historical_weather";
  }
  if (targetAt.getTime() - nowMs > PAST_THRESHOLD_MS) {
    return "forecast_weather";
  }
  return "current_weather";
}

function toBridgeWeatherRecord(input: {
  location: string;
  eventDate: string;
  eventTimeSource: BridgeEventTimeSource;
  weather: WeatherContext & { high_c?: number; low_c?: number };
  source: BridgeWeatherSource;
}): BridgeWeatherRecord {
  const temp = Math.round(input.weather.temp_c ?? 10);
  const high = Math.round(input.weather.high_c ?? temp);
  const low = Math.round(input.weather.low_c ?? temp);
  return {
    eventDate: input.eventDate,
    location: input.location,
    condition: input.weather.condition_label?.trim() || input.weather.summary?.trim() || "—",
    temperature: temp,
    high,
    low,
    source: input.source,
    eventTimeSource: input.eventTimeSource,
    resolvedAtIso: new Date().toISOString(),
  };
}

export type BridgeWeatherResolveResult = {
  weather: WeatherContext;
  bridgeWeather: BridgeWeatherRecord;
  target_at: string;
};

/** Fetch + normalize bridge weather at the experience instant. */
export async function resolveBridgeWeatherSnapshot(input: {
  location: string;
  targetAt: Date;
  eventDate: string;
  eventTimeSource: BridgeEventTimeSource;
}): Promise<BridgeWeatherResolveResult | null> {
  const location = input.location.trim();
  const targetAt = input.targetAt;
  if (!location || Number.isNaN(targetAt.getTime())) {
    return null;
  }

  const nowMs = Date.now();
  const isHistorical = targetAt.getTime() < nowMs - PAST_THRESHOLD_MS;

  if (isHistorical) {
    const historical = await fetchHistoricalWeatherAt({ location, targetAt });
    if (!historical) {
      return null;
    }
    const bridgeWeather = toBridgeWeatherRecord({
      location,
      eventDate: input.eventDate,
      eventTimeSource: input.eventTimeSource,
      weather: historical,
      source: "historical_weather",
    });
    return {
      weather: historical,
      bridgeWeather,
      target_at: historical.target_at,
    };
  }

  const forecast = await fetchWeatherForecastAt({ location, targetAt });
  if (!forecast) {
    return null;
  }

  const bridgeWeather = toBridgeWeatherRecord({
    location,
    eventDate: input.eventDate,
    eventTimeSource: input.eventTimeSource,
    weather: {
      ...forecast,
      high_c: forecast.temp_c,
      low_c: forecast.temp_c,
    },
    source: weatherSourceForTarget(targetAt, nowMs, "forecast"),
  });

  return {
    weather: forecast,
    bridgeWeather,
    target_at: forecast.target_at,
  };
}
