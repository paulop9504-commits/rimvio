import type { WeatherContext } from "@/lib/context-resolver/types";
import type {
  BridgeEventTimeSource,
  BridgeWeatherRecord,
} from "@/lib/globe/bridge-weather/bridge-weather-types";

export type WeatherForecastClientPayload = {
  prep_line: string | null;
  weather: WeatherContext | null;
  bridge_weather?: BridgeWeatherRecord | null;
  target_at?: string;
};

/** Browser read path — experience-time weather + prep one-liner. */
export async function fetchWeatherForecastClient(input: {
  location: string;
  targetIso: string;
  eventDate?: string;
  eventTimeSource?: BridgeEventTimeSource;
}): Promise<WeatherForecastClientPayload | null> {
  const location = input.location.trim();
  const targetIso = input.targetIso.trim();
  if (!location || !targetIso || typeof window === "undefined") {
    return null;
  }

  try {
    const params = new URLSearchParams({ location, at: targetIso });
    if (input.eventDate?.trim()) {
      params.set("event_date", input.eventDate.trim());
    }
    if (input.eventTimeSource) {
      params.set("event_time_source", input.eventTimeSource);
    }
    const response = await fetch(`/api/context/weather/forecast?${params.toString()}`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as WeatherForecastClientPayload;
  } catch {
    return null;
  }
}
