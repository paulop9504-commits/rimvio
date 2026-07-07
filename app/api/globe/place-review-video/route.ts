import { NextResponse } from "next/server";
import {
  resolvePlaceReviewVideos,
  type PlaceReviewKind,
} from "@/lib/globe/place-review-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNumber(value: string | null): number | null {
  if (value == null || !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseKind(value: string | null): PlaceReviewKind {
  if (value === "lodging" || value === "eatery") {
    return value;
  }
  return "place";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }

  const result = await resolvePlaceReviewVideos({
    name,
    place: url.searchParams.get("place"),
    kind: parseKind(url.searchParams.get("kind")),
    lat: parseNumber(url.searchParams.get("lat")),
    lng: parseNumber(url.searchParams.get("lng")),
  });

  return NextResponse.json({ ok: true, ...result });
}
