/**
 * Live external SSOT for Research — Places / LiteAPI / (optional) geocode.
 * Not scout inventory; network fetch when Fast Scan needs real candidates.
 */

import type { InventoryHitRow } from "@/lib/research-engine/tools/match-inventory-hit";
import { matchInventoryHit } from "@/lib/research-engine/tools/match-inventory-hit";

export type ResearchLiveSurface = "lodging" | "eatery" | "activity" | "amenity";

export type LiveInventoryRow = InventoryHitRow & {
  readonly source: "google_places" | "liteapi" | "unknown";
  readonly surface: ResearchLiveSurface;
  readonly youtubeConfidence?: number | null;
  readonly videoTitle?: string | null;
};

function canFetch(fetchImpl?: typeof fetch): boolean {
  return typeof (fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined)) === "function";
}

async function fetchJson(
  url: string,
  fetchImpl?: typeof fetch,
): Promise<unknown | null> {
  if (!canFetch(fetchImpl)) return null;
  try {
    const res = await (fetchImpl ?? fetch)(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function readLiveInventory(json: unknown): InventoryHitRow[] {
  if (!json || typeof json !== "object") return [];
  const inv = (json as { inventory?: unknown }).inventory;
  if (!Array.isArray(inv)) return [];
  return inv.filter(
    (row): row is InventoryHitRow =>
      row != null &&
      typeof row === "object" &&
      typeof (row as { name?: unknown }).name === "string",
  );
}

function tomorrowIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dayAfterTomorrowIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 2);
  return d.toISOString().slice(0, 10);
}

/** Which discovery surfaces Research should fetch live. */
export function resolveResearchLiveSurfaces(text: string): ResearchLiveSurface[] {
  const trimmed = text.trim();
  const out: ResearchLiveSurface[] = [];
  if (/(?:호텔|숙소|캡슐|게스트|hostels?|hotels?|lodging|료칸|민박)/iu.test(trimmed)) {
    out.push("lodging");
  }
  if (/(?:맛집|식당|카페|초밥|라멘|restaurants?|cafes?)/iu.test(trimmed)) {
    out.push("eatery");
  }
  if (/(?:놀거리|관광|명소|볼거리|액티비티|attraction|museum|park)/iu.test(trimmed)) {
    out.push("activity");
  }
  if (/(?:약국|편의점|은행|병원|pharmacy)/iu.test(trimmed)) {
    out.push("amenity");
  }
  if (out.length === 0) {
    out.push("lodging");
  }
  return out;
}

/** Geocode fallback when context has no spatial target. */
export async function resolveLiveResearchAnchor(input: {
  query: string;
  lat?: number | null;
  lng?: number | null;
  fetchImpl?: typeof fetch;
}): Promise<{ lat: number; lng: number; label: string | null } | null> {
  if (
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    return { lat: input.lat, lng: input.lng, label: null };
  }
  const q = input.query.trim().slice(0, 48);
  if (!q) return null;
  const qs = new URLSearchParams({ q });
  const json = (await fetchJson(
    `/api/location/geocode?${qs.toString()}`,
    input.fetchImpl,
  )) as {
    suggestions?: readonly {
      lat?: number;
      lng?: number;
      label?: string;
      name?: string;
    }[];
  } | null;
  const hit = json?.suggestions?.[0];
  if (
    hit?.lat == null ||
    hit?.lng == null ||
    !Number.isFinite(hit.lat) ||
    !Number.isFinite(hit.lng)
  ) {
    return null;
  }
  return {
    lat: hit.lat,
    lng: hit.lng,
    label: hit.label ?? hit.name ?? null,
  };
}

/** Places inventory with keyword — reviews · ★ (blocks LiteAPI). */
export async function fetchLiveLodgingPlaces(input: {
  lat: number;
  lng: number;
  keyword: string;
  max?: number;
  fetchImpl?: typeof fetch;
}): Promise<LiveInventoryRow[]> {
  const qs = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.max ?? 8),
    keyword: input.keyword.slice(0, 40) || "hotel",
  });
  const json = await fetchJson(
    `/api/globe/lodging-inventory?${qs.toString()}`,
    input.fetchImpl,
  );
  return readLiveInventory(json).map((row) => ({
    ...row,
    source: "google_places" as const,
    surface: "lodging" as const,
  }));
}

/** LiteAPI rates — no keyword. */
export async function fetchLiveLodgingRates(input: {
  lat: number;
  lng: number;
  max?: number;
  fetchImpl?: typeof fetch;
}): Promise<LiveInventoryRow[]> {
  const qs = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.max ?? 8),
    checkIn: tomorrowIso(),
    checkOut: dayAfterTomorrowIso(),
    guests: "2",
  });
  const json = await fetchJson(
    `/api/globe/lodging-inventory?${qs.toString()}`,
    input.fetchImpl,
  );
  const source =
    json && typeof json === "object" && (json as { source?: string }).source === "liteapi"
      ? ("liteapi" as const)
      : ("unknown" as const);
  return readLiveInventory(json).map((row) => ({
    ...row,
    source,
    surface: "lodging" as const,
  }));
}

export async function fetchLiveEateryInventory(input: {
  lat: number;
  lng: number;
  query: string;
  max?: number;
  fetchImpl?: typeof fetch;
}): Promise<LiveInventoryRow[]> {
  const qs = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.max ?? 6),
    q: input.query.slice(0, 40) || "맛집",
  });
  const json = await fetchJson(
    `/api/globe/eatery-inventory?${qs.toString()}`,
    input.fetchImpl,
  );
  return readLiveInventory(json).map((row) => ({
    ...row,
    source: "google_places" as const,
    surface: "eatery" as const,
  }));
}

export async function fetchLivePlaceInventory(input: {
  lat: number;
  lng: number;
  domain: "activity" | "amenity";
  query: string;
  max?: number;
  fetchImpl?: typeof fetch;
}): Promise<LiveInventoryRow[]> {
  const qs = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.max ?? 6),
    domain: input.domain,
    q: input.query.slice(0, 40) || (input.domain === "amenity" ? "편의점" : "관광"),
  });
  const json = await fetchJson(
    `/api/globe/place-inventory?${qs.toString()}`,
    input.fetchImpl,
  );
  return readLiveInventory(json).map((row) => ({
    ...row,
    source: "google_places" as const,
    surface: input.domain,
  }));
}

export async function fetchLiveYtPreview(input: {
  title: string;
  lat?: number | null;
  lng?: number | null;
  fetchImpl?: typeof fetch;
}): Promise<{ confidence: number; videoTitle: string | null } | null> {
  const qs = new URLSearchParams({ name: input.title.slice(0, 80) });
  if (input.lat != null) qs.set("lat", String(input.lat));
  if (input.lng != null) qs.set("lng", String(input.lng));
  const json = (await fetchJson(
    `/api/globe/lodging-preview-video?${qs.toString()}`,
    input.fetchImpl,
  )) as {
    preview?: { confidence?: number; title?: string } | null;
  } | null;
  if (!json?.preview?.confidence || json.preview.confidence < 0.55) {
    return null;
  }
  return {
    confidence: json.preview.confidence,
    videoTitle: json.preview.title ?? null,
  };
}

/**
 * Merge Places (reviews) + LiteAPI (price) by placeId/name/nearest.
 */
export function mergeLodgingPlacesWithRates(
  places: readonly LiveInventoryRow[],
  rates: readonly LiveInventoryRow[],
): LiveInventoryRow[] {
  if (places.length === 0) {
    return [...rates];
  }
  return places.map((place) => {
    const rateHit = matchInventoryHit(rates, {
      title: place.name ?? "",
      placeId: place.placeId,
      lat: place.lat,
      lng: place.lng,
    });
    if (!rateHit || rateHit.priceKrw == null) {
      return place;
    }
    return {
      ...place,
      priceKrw: rateHit.priceKrw,
      source: rateHit.source === "liteapi" ? "liteapi" : place.source,
    };
  });
}

/** Pull live rows for all surfaces named in the utterance. */
export async function fetchLiveResearchInventory(input: {
  lat: number;
  lng: number;
  message: string;
  surfaces?: readonly ResearchLiveSurface[];
  maxPerSurface?: number;
  fetchImpl?: typeof fetch;
  /** Soft YT on top lodging row (optional — surgical also covers). */
  enrichYt?: boolean;
}): Promise<LiveInventoryRow[]> {
  const surfaces =
    input.surfaces ?? resolveResearchLiveSurfaces(input.message);
  const max = input.maxPerSurface ?? 6;
  const tasks: Promise<LiveInventoryRow[]>[] = [];

  if (surfaces.includes("lodging")) {
    tasks.push(
      (async () => {
        const [places, rates] = await Promise.all([
          fetchLiveLodgingPlaces({
            lat: input.lat,
            lng: input.lng,
            keyword: /캡슐/u.test(input.message) ? "capsule hotel" : "hotel",
            max,
            fetchImpl: input.fetchImpl,
          }),
          fetchLiveLodgingRates({
            lat: input.lat,
            lng: input.lng,
            max,
            fetchImpl: input.fetchImpl,
          }),
        ]);
        return mergeLodgingPlacesWithRates(places, rates);
      })(),
    );
  }
  if (surfaces.includes("eatery")) {
    tasks.push(
      fetchLiveEateryInventory({
        lat: input.lat,
        lng: input.lng,
        query: "맛집",
        max,
        fetchImpl: input.fetchImpl,
      }),
    );
  }
  if (surfaces.includes("activity")) {
    tasks.push(
      fetchLivePlaceInventory({
        lat: input.lat,
        lng: input.lng,
        domain: "activity",
        query: "관광",
        max,
        fetchImpl: input.fetchImpl,
      }),
    );
  }
  if (surfaces.includes("amenity")) {
    tasks.push(
      fetchLivePlaceInventory({
        lat: input.lat,
        lng: input.lng,
        domain: "amenity",
        query: "편의점",
        max,
        fetchImpl: input.fetchImpl,
      }),
    );
  }

  const chunks = await Promise.all(tasks);
  let rows = chunks.flat();

  if (input.enrichYt && rows.some((r) => r.surface === "lodging")) {
    const top = rows.find((r) => r.surface === "lodging" && r.name);
    if (top?.name) {
      const yt = await fetchLiveYtPreview({
        title: top.name,
        lat: top.lat,
        lng: top.lng,
        fetchImpl: input.fetchImpl,
      });
      if (yt) {
        rows = rows.map((r) =>
          r === top
            ? {
                ...r,
                youtubeConfidence: yt.confidence,
                videoTitle: yt.videoTitle,
              }
            : r,
        );
      }
    }
  }

  return rows;
}
