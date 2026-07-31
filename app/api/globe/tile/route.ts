import { type NextRequest, NextResponse } from "next/server";
import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { fetchGlobeTileUpstream } from "@/lib/globe/fetch-globe-tile-upstream";
import {
  remapRimvioGlobeMapTilePng,
  shouldRemapRimvioGlobeMapTileStyle,
} from "@/lib/globe/remap-rimvio-globe-map-tile-png";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const z = Number(params.get("z"));
  const x = Number(params.get("x"));
  const y = Number(params.get("y"));
  const style = (params.get("style")?.trim() || "satellite") as GlobeMapTileStyle;

  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return NextResponse.json({ error: "invalid_tile_coords" }, { status: 400 });
  }

  try {
    const fetched = await fetchGlobeTileUpstream({ z, x, y, style });
    if (!fetched) {
      // Soft fail — avoid browser retry storms (429 loops)
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      });
    }
    let body: Buffer = fetched.body;
    if (shouldRemapRimvioGlobeMapTileStyle(style)) {
      try {
        body = remapRimvioGlobeMapTilePng(fetched.body);
      } catch {
        body = fetched.body;
      }
    }
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": fetched.contentType,
        "Cache-Control": fetched.cacheHit
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : "public, max-age=3600, stale-while-revalidate=86400",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "X-Rimvio-Tile-Cache": fetched.cacheHit ? "hit" : "miss",
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "public, max-age=15",
      },
    });
  }
}
