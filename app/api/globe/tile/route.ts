import { type NextRequest, NextResponse } from "next/server";
import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { fetchGlobeTileUpstream } from "@/lib/globe/fetch-globe-tile-upstream";
import {
  remapRimvioGlobeMapTilePng,
  shouldRemapRimvioGlobeMapTileStyle,
} from "@/lib/globe/remap-rimvio-globe-map-tile-png";

export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const maxDuration = 15;

function tileCacheHeaders(input: {
  readonly cacheHit: boolean;
}): HeadersInit {
  // Pro CDN: long s-maxage so edge serves tiles without origin / 429 storms.
  const browser = 86_400;
  const edge = 604_800;
  const swr = 2_592_000;
  return {
    "Cache-Control": `public, max-age=${browser}, s-maxage=${edge}, stale-while-revalidate=${swr}`,
    "CDN-Cache-Control": `public, s-maxage=${edge}, stale-while-revalidate=${swr}`,
    "Vercel-CDN-Cache-Control": `public, s-maxage=${edge}, stale-while-revalidate=${swr}`,
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Rimvio-Tile-Cache": input.cacheHit ? "hit" : "miss",
  };
}

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
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Cache-Control":
            "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
          "CDN-Cache-Control": "public, s-maxage=60",
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
        ...tileCacheHeaders({ cacheHit: fetched.cacheHit }),
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=30",
      },
    });
  }
}
