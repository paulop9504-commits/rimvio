/**
 * Globe tile upstream fetch — memory cache, concurrency cap, CARTO→OSM fallback.
 * Stops 429 storms from cascading through /api/globe/tile.
 */

import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { resolveGlobeTileUpstreamUrl } from "@/lib/experience-graph/resolve-globe-tile-upstream";
import { resolveGlobeTileFallbackUrls } from "@/lib/experience-graph/resolve-globe-tile-fallback-urls";

export type GlobeTileFetchResult = {
  readonly body: Buffer;
  readonly contentType: string;
  readonly cacheHit: boolean;
};

type CacheEntry = {
  body: Buffer;
  contentType: string;
  expiresAt: number;
};

const CACHE_TTL_MS = 86_400_000;
const CACHE_MAX = 256;
const MAX_INFLIGHT = 6;

const cache = new Map<string, CacheEntry>();
let inflight = 0;
const waitQueue: Array<() => void> = [];

function cacheKey(
  z: number,
  x: number,
  y: number,
  style: GlobeMapTileStyle,
): string {
  return `${style}:${z}:${x}:${y}`;
}

function readCache(key: string): CacheEntry | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU touch
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function writeCache(key: string, entry: CacheEntry): void {
  cache.set(key, entry);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest == null) break;
    cache.delete(oldest);
  }
}

async function acquireSlot(): Promise<void> {
  if (inflight < MAX_INFLIGHT) {
    inflight += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    waitQueue.push(() => {
      inflight += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  inflight = Math.max(0, inflight - 1);
  const next = waitQueue.shift();
  if (next) next();
}

async function fetchOne(
  url: string,
): Promise<{ ok: true; body: Buffer; contentType: string } | { ok: false; status: number }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RimvioGlobe/1.0 (https://rimvio.com)",
        Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
      },
      // Avoid Next data-cache stampede on tile floods
      cache: "force-cache",
      next: { revalidate: 86_400 },
    });
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength < 32) {
      return { ok: false, status: 502 };
    }
    return {
      ok: true,
      body,
      contentType: response.headers.get("content-type") ?? "image/png",
    };
  } catch {
    return { ok: false, status: 502 };
  }
}

export async function fetchGlobeTileUpstream(input: {
  z: number;
  x: number;
  y: number;
  style: GlobeMapTileStyle;
}): Promise<GlobeTileFetchResult | null> {
  const key = cacheKey(input.z, input.x, input.y, input.style);
  const cached = readCache(key);
  if (cached) {
    return {
      body: cached.body,
      contentType: cached.contentType,
      cacheHit: true,
    };
  }

  const primary = resolveGlobeTileUpstreamUrl(input);
  if (!primary) return null;

  const urls = [
    primary,
    ...resolveGlobeTileFallbackUrls(input).filter((u) => u !== primary),
  ];

  await acquireSlot();
  try {
    // Re-check cache after waiting in queue
    const again = readCache(key);
    if (again) {
      return {
        body: again.body,
        contentType: again.contentType,
        cacheHit: true,
      };
    }

    for (const url of urls) {
      const result = await fetchOne(url);
      if (!result.ok) {
        // Skip immediately to fallback on rate-limit / soft fail
        if (result.status === 429 || result.status >= 500) continue;
        continue;
      }
      writeCache(key, {
        body: result.body,
        contentType: result.contentType,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return {
        body: result.body,
        contentType: result.contentType,
        cacheHit: false,
      };
    }
    return null;
  } finally {
    releaseSlot();
  }
}
