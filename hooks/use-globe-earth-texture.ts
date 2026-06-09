"use client";

import { useEffect, useState } from "react";
import {
  GLOBE_EQ_HEIGHT,
  GLOBE_EQ_WIDTH,
  GLOBE_TEXTURE_ZOOM,
  listMercatorTileCoords,
  reprojectMercatorMosaicToEquirectangular,
} from "@/lib/experience-graph/reproject-mercator-to-equirectangular";

const TILE_SIZE = 256;
const TEXTURE_CACHE = new Map<string, string>();

function tileProxyUrl(z: number, x: number, y: number): string {
  return `/api/globe/tile?z=${z}&x=${x}&y=${y}&style=satellite`;
}

function tileDirectUrl(z: number, x: number, y: number): string {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
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

async function loadTileImage(z: number, x: number, y: number): Promise<HTMLImageElement> {
  try {
    return await loadImage(tileProxyUrl(z, x, y));
  } catch {
    return loadImage(tileDirectUrl(z, x, y));
  }
}

async function buildEarthTextureUrl(zoom = GLOBE_TEXTURE_ZOOM): Promise<string> {
  const cacheKey = `satellite-eq-z${zoom}`;
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
      const img = await loadTileImage(zoom, x, y);
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

  const url = output.toDataURL("image/jpeg", 0.92);
  TEXTURE_CACHE.set(cacheKey, url);
  return url;
}

export type GlobeEarthTextureState = {
  textureUrl: string | null;
  loading: boolean;
  error: string | null;
};

/** Build a full-earth equirectangular satellite texture once (cached). */
export function useGlobeEarthTexture(): GlobeEarthTextureState {
  const [textureUrl, setTextureUrl] = useState<string | null>(
    () => TEXTURE_CACHE.get(`satellite-eq-z${GLOBE_TEXTURE_ZOOM}`) ?? null,
  );
  const [loading, setLoading] = useState(!textureUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (textureUrl) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void buildEarthTextureUrl()
      .then((url) => {
        if (cancelled) {
          return;
        }
        setTextureUrl(url);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "texture_build_failed");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [textureUrl]);

  return { textureUrl, loading, error };
}
