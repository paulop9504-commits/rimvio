import { type NextRequest, NextResponse } from "next/server";
import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { resolveGlobeTileUpstreamUrl } from "@/lib/experience-graph/resolve-globe-tile-upstream";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const z = Number(params.get("z"));
  const x = Number(params.get("x"));
  const y = Number(params.get("y"));
  const style = (params.get("style")?.trim() || "satellite") as GlobeMapTileStyle;

  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return NextResponse.json({ error: "invalid_tile_coords" }, { status: 400 });
  }

  const upstream = resolveGlobeTileUpstreamUrl({ z, x, y, style });
  if (!upstream) {
    return NextResponse.json({ error: "invalid_tile_style" }, { status: 400 });
  }

  try {
    const response = await fetch(upstream, {
      headers: { "User-Agent": "RimvioGlobe/1.0" },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "tile_upstream_failed" }, { status: 502 });
    }
    const bytes = await response.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "tile_fetch_failed" }, { status: 502 });
  }
}
