import { NextResponse } from "next/server";
import { fetchTrafficContext } from "@/lib/traffic/fetch-traffic-context";

export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get("destination")?.trim();
  const origin = searchParams.get("origin")?.trim() ?? null;

  if (!destination) {
    return NextResponse.json({ error: "destination_required" }, { status: 400 });
  }

  const traffic = await fetchTrafficContext({
    destination,
    originHint: origin,
  });

  return NextResponse.json(traffic, {
    headers: {
      "Cache-Control":
        "public, s-maxage=120, stale-while-revalidate=600, max-age=30",
      "CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=120, stale-while-revalidate=600",
    },
  });
}
