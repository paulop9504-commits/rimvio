import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import {
  GLOBE_EQ_HEIGHT,
  GLOBE_EQ_WIDTH,
  GLOBE_TEXTURE_ZOOM,
  listMercatorTileCoords,
  reprojectMercatorMosaicToEquirectangular,
} from "@/lib/experience-graph/reproject-mercator-to-equirectangular";

const TILE_SIZE = 256;
const TEXTURE_CACHE = new Map<string, string>();

function tileProxyUrl(z: number, x: number, y: number, style: GlobeMapTileStyle): string {
  return `/api/globe/tile?z=${z}&x=${x}&y=${y}&style=${style}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`tile_load_failed:${src}`));
    img.src = src;
  });
}

async function loadTileImage(
  z: number,
  x: number,
  y: number,
  style: GlobeMapTileStyle,
): Promise<HTMLImageElement> {
  return loadImage(tileProxyUrl(z, x, y, style));
}

export function globeEquirectCacheKey(
  style: GlobeMapTileStyle,
  zoom = GLOBE_TEXTURE_ZOOM,
): string {
  return `${style}-eq-z${zoom}`;
}

export function readGlobeEquirectCache(
  style: GlobeMapTileStyle,
  zoom = GLOBE_TEXTURE_ZOOM,
): string | null {
  return TEXTURE_CACHE.get(globeEquirectCacheKey(style, zoom)) ?? null;
}

/** Full-earth equirectangular mosaic — Voyager for Toss overview, satellite for legacy 2D. */
export async function buildGlobeEquirectTextureUrl(
  style: GlobeMapTileStyle,
  zoom = GLOBE_TEXTURE_ZOOM,
): Promise<string> {
  const cacheKey = globeEquirectCacheKey(style, zoom);
  const cached = TEXTURE_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const n = 2 ** zoom;
  const mosaicWidth = n * TILE_SIZE;
  const mosaicHeight = n * TILE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = mosaicWidth;
  canvas.height = mosaicHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas_context_unavailable");
  }

  const coords = listMercatorTileCoords(zoom);
  await Promise.all(
    coords.map(async ({ x, y }) => {
      const img = await loadTileImage(zoom, x, y, style);
      ctx.drawImage(img, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }),
  );

  const mosaic = ctx.getImageData(0, 0, mosaicWidth, mosaicHeight);
  const equirect = reprojectMercatorMosaicToEquirectangular({
    mercatorPixels: mosaic.data,
    mercatorWidth: mosaicWidth,
    mercatorHeight: mosaicHeight,
    zoom,
    outputWidth: GLOBE_EQ_WIDTH,
    outputHeight: GLOBE_EQ_HEIGHT,
  });

  const output = document.createElement("canvas");
  output.width = GLOBE_EQ_WIDTH;
  output.height = GLOBE_EQ_HEIGHT;
  const outputCtx = output.getContext("2d");
  if (!outputCtx) {
    throw new Error("canvas_context_unavailable");
  }
  outputCtx.putImageData(
    new ImageData(equirect, GLOBE_EQ_WIDTH, GLOBE_EQ_HEIGHT),
    0,
    0,
  );

  const url =
    style === "satellite"
      ? output.toDataURL("image/jpeg", 0.92)
      : output.toDataURL("image/png");
  TEXTURE_CACHE.set(cacheKey, url);
  return url;
}
