import { NextResponse } from "next/server";
import { fetchWeatherContext } from "@/lib/context-resolver/weather/fetch-weather-context";

export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();

  if (!location) {
    return NextResponse.json({ error: "location_required" }, { status: 400 });
  }

  const weather = await fetchWeatherContext(location);
  return NextResponse.json(weather, {
    headers: {
      // Pro CDN — weather changes slowly; burn Edge Request quota usefully.
      "Cache-Control":
        "public, s-maxage=600, stale-while-revalidate=3600, max-age=60",
      "CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
