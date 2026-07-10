import { NextResponse } from "next/server";
import { resolveLodgingYouTubePreview } from "@/lib/globe/lodging/resolve-lodging-youtube-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNumber(value: string | null): number | null {
  if (value == null || !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Gated lodging YouTube Shorts / short embed preview. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }

  const preview = await resolveLodgingYouTubePreview({
    name,
    place: url.searchParams.get("place"),
    address: url.searchParams.get("address"),
    lat: parseNumber(url.searchParams.get("lat")),
    lng: parseNumber(url.searchParams.get("lng")),
    audienceLocale: url.searchParams.get("locale"),
  });

  if (!preview) {
    return NextResponse.json({ preview: null });
  }

  return NextResponse.json({ preview });
}
