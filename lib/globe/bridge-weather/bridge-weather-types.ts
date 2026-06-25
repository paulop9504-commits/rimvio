/** SSOT — Bridge weather preserved at experience time, not upload time. */

export type BridgeEventTimeSource =
  | "photo_exif"
  | "event_start"
  | "visit_date"
  | "check_in_out"
  | "bridge_created";

export type BridgeWeatherSource =
  | "historical_weather"
  | "forecast_weather"
  | "current_weather";

export type BridgeWeatherRecord = {
  eventDate: string;
  location: string;
  condition: string;
  temperature: number;
  high: number;
  low: number;
  source: BridgeWeatherSource;
  eventTimeSource: BridgeEventTimeSource;
  resolvedAtIso: string;
};

export const BRIDGE_WEATHER_META_KEY = "bridgeWeather" as const;

export type ResolvedBridgeEventTime = {
  eventAtIso: string;
  eventDate: string;
  source: BridgeEventTimeSource;
};
