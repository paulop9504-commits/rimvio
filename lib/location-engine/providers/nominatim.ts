/**
 * OpenStreetMap Nominatim — forward + reverse geocode (MVP world provider).
 * Respect usage policy: identifiable User-Agent, light rate limiting.
 */

import type { LocationAdminParts } from "@/lib/location-engine/types";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "RimvioLocationEngine/1.0 (https://rimvio.com; location-os)";

export type NominatimHit = {
  lat: number;
  lng: number;
  displayName: string;
  placeId: string;
  osmType: string | null;
  osmId: string | null;
  admin: LocationAdminParts;
  labelKo: string;
  labelEn: string;
};

type NominatimJson = {
  place_id?: number | string;
  lat?: string;
  lon?: string;
  display_name?: string;
  osm_type?: string;
  osm_id?: number | string;
  name?: string;
  address?: Record<string, string>;
  namedetails?: Record<string, string>;
};

let lastRequestAt = 0;

async function throttleNominatim(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequestAt = Date.now();
}

function parseAdmin(address: Record<string, string> | undefined): LocationAdminParts {
  if (!address) {
    return {
      countryCode: null,
      countryName: null,
      region: null,
      city: null,
      district: null,
      neighborhood: null,
    };
  }
  const countryCode = address.country_code?.toUpperCase() ?? null;
  const countryName = address.country ?? null;
  const region =
    address.state ??
    address.province ??
    address.region ??
    address["ISO3166-2-lvl4"] ??
    null;
  const city =
    address.city ??
    address.town ??
    address.municipality ??
    address.county ??
    null;
  const district =
    address.city_district ??
    address.borough ??
    address.suburb ??
    address.quarter ??
    address.district ??
    null;
  const neighborhood =
    address.neighbourhood ?? address.neighborhood ?? address.hamlet ?? null;
  return {
    countryCode,
    countryName,
    region,
    city,
    district,
    neighborhood,
  };
}

function labelsFromHit(row: NominatimJson, admin: LocationAdminParts): {
  labelKo: string;
  labelEn: string;
} {
  const namedetails = row.namedetails ?? {};
  const ko =
    namedetails["name:ko"]?.trim() ||
    namedetails.name?.trim() ||
    row.name?.trim() ||
    admin.district ||
    admin.city ||
    admin.region ||
    row.display_name?.split(",")[0]?.trim() ||
    "장소";
  const en =
    namedetails["name:en"]?.trim() ||
    namedetails.name?.trim() ||
    row.name?.trim() ||
    admin.district ||
    admin.city ||
    ko;
  return { labelKo: ko, labelEn: en };
}

function toHit(row: NominatimJson): NominatimHit | null {
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const admin = parseAdmin(row.address);
  const { labelKo, labelEn } = labelsFromHit(row, admin);
  return {
    lat,
    lng,
    displayName: row.display_name?.trim() || labelEn,
    placeId: String(row.place_id ?? `${row.osm_type}:${row.osm_id}`),
    osmType: row.osm_type ? String(row.osm_type) : null,
    osmId: row.osm_id != null ? String(row.osm_id) : null,
    admin,
    labelKo,
    labelEn,
  };
}

async function nominatimFetch(url: string): Promise<Response | null> {
  try {
    await throttleNominatim();
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return null;
    }
    return response;
  } catch {
    return null;
  }
}

/** Address / place name → GPS + admin parts. */
export async function nominatimGeocode(
  query: string,
): Promise<NominatimHit | null> {
  const q = query.trim();
  if (!q || q.length < 2) {
    return null;
  }
  const url = `${NOMINATIM_BASE}/search?${new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    namedetails: "1",
    limit: "1",
  }).toString()}`;
  const response = await nominatimFetch(url);
  if (!response) {
    return null;
  }
  const json = (await response.json()) as NominatimJson[];
  if (!Array.isArray(json) || json.length === 0) {
    return null;
  }
  return toHit(json[0]!);
}

export type NominatimGeometryHit = NominatimHit & {
  readonly geometry: GeoJSON.Geometry | null;
  readonly boundingbox: readonly [number, number, number, number] | null;
};

/** Forward geocode with optional GeoJSON footprint (polygon / bbox). */
export async function nominatimGeocodeWithGeometry(
  query: string,
): Promise<NominatimGeometryHit | null> {
  const q = query.trim();
  if (!q || q.length < 2) {
    return null;
  }
  const url = `${NOMINATIM_BASE}/search?${new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    namedetails: "1",
    limit: "1",
    polygon_geojson: "1",
  }).toString()}`;
  const response = await nominatimFetch(url);
  if (!response) {
    return null;
  }
  const json = (await response.json()) as Array<
    NominatimJson & {
      geojson?: GeoJSON.Geometry;
      boundingbox?: string[];
    }
  >;
  if (!Array.isArray(json) || json.length === 0) {
    return null;
  }
  const raw = json[0]!;
  const hit = toHit(raw);
  if (!hit) return null;
  let boundingbox: readonly [number, number, number, number] | null = null;
  const bb = raw.boundingbox;
  if (Array.isArray(bb) && bb.length >= 4) {
    const south = Number(bb[0]);
    const north = Number(bb[1]);
    const west = Number(bb[2]);
    const east = Number(bb[3]);
    if ([south, north, west, east].every(Number.isFinite)) {
      boundingbox = [south, north, west, east];
    }
  }
  const out: NominatimGeometryHit = {
    lat: hit.lat,
    lng: hit.lng,
    displayName: hit.displayName,
    placeId: hit.placeId,
    osmType: hit.osmType,
    osmId: hit.osmId,
    admin: hit.admin,
    labelKo: hit.labelKo,
    labelEn: hit.labelEn,
    geometry: raw.geojson ?? null,
    boundingbox,
  };
  return out;
}

/** GPS → address + admin parts. */
export async function nominatimReverseGeocode(
  lat: number,
  lng: number,
): Promise<NominatimHit | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const url = `${NOMINATIM_BASE}/reverse?${new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    addressdetails: "1",
    namedetails: "1",
    zoom: "16",
  }).toString()}`;
  const response = await nominatimFetch(url);
  if (!response) {
    return null;
  }
  const json = (await response.json()) as NominatimJson;
  if (!json || typeof json !== "object") {
    return null;
  }
  return toHit(json);
}

/** Prefix autocomplete (Nominatim bounded). */
export async function nominatimAutocomplete(
  query: string,
  limit = 5,
): Promise<NominatimHit[]> {
  const q = query.trim();
  if (!q || q.length < 1) {
    return [];
  }
  const url = `${NOMINATIM_BASE}/search?${new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    namedetails: "1",
    limit: String(Math.min(8, Math.max(1, limit))),
  }).toString()}`;
  const response = await nominatimFetch(url);
  if (!response) {
    return [];
  }
  const json = (await response.json()) as NominatimJson[];
  if (!Array.isArray(json)) {
    return [];
  }
  return json
    .map((row) => toHit(row))
    .filter((row): row is NominatimHit => row != null);
}
