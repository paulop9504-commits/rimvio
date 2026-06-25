import { NextResponse } from "next/server";
import { composeWeatherPrepLine } from "@/lib/plan-context/compose-weather-prep-line";
import { resolveBridgeWeatherSnapshot } from "@/lib/globe/bridge-weather/resolve-bridge-weather-snapshot";
import type { BridgeEventTimeSource } from "@/lib/globe/bridge-weather/bridge-weather-types";

export const runtime = "nodejs";

function readEventTimeSource(raw: string | null): BridgeEventTimeSource {
  const value = raw?.trim();
  if (
    value === "photo_exif" ||
    value === "event_start" ||
    value === "visit_date" ||
    value === "check_in_out" ||
    value === "bridge_created"
  ) {
    return value;
  }
  return "event_start";
}

function toEventDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();
  const at = searchParams.get("at")?.trim();

  if (!location || !at) {
    return NextResponse.json({ error: "location_and_at_required" }, { status: 400 });
  }

  const targetAt = new Date(at);
  if (Number.isNaN(targetAt.getTime())) {
    return NextResponse.json({ error: "invalid_at" }, { status: 400 });
  }

  const snapshot = await resolveBridgeWeatherSnapshot({
    location,
    targetAt,
    eventDate: searchParams.get("event_date")?.trim() || toEventDate(targetAt),
    eventTimeSource: readEventTimeSource(searchParams.get("event_time_source")),
  });

  if (!snapshot) {
    return NextResponse.json({ prep_line: null, weather: null, bridge_weather: null });
  }

  const prep_line = composeWeatherPrepLine({
    weather: snapshot.weather,
    targetAt,
  });

  return NextResponse.json({
    prep_line,
    weather: snapshot.weather,
    bridge_weather: snapshot.bridgeWeather,
    target_at: snapshot.target_at,
  });
}
