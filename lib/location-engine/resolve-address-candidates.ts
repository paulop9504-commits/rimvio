/**
 * Resolve worldwide street address → multi candidate pins (user picks when ambiguous).
 * Providers: Nominatim (world) · Naver (KR) · Google Places (optional).
 * Not a seed catalog.
 */

import { haversineKm } from "@/lib/geo/haversine-km";
import {
  inferAddressCountryCodes,
  isKoreanAddressQuery,
  isStreetAddressQuery,
} from "@/lib/location-engine/street-address-query";
import {
  nominatimAutocomplete,
  type NominatimHit,
} from "@/lib/location-engine/providers/nominatim";
import { findPlacesByName } from "@/lib/locate/google-places-find";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { fetchNaverLocalPlaceCandidates } from "@/lib/naver/local-to-place-candidate";

export type AddressLocateCandidate = {
  readonly id: string;
  readonly labelKo: string;
  readonly subtitleKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly addressKo: string;
  readonly provider: "nominatim" | "naver" | "google";
};

function regionSubtitleFromDisplay(display: string, labelKo: string): string {
  const parts = display
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const si = parts.find((p) =>
    /(?:특별시|광역시|특별자치시|특별자치도|都|道|府|県|省|市)$/u.test(p),
  );
  const gu = parts.find((p) => /(?:구|区|郡)$/u.test(p));
  const dong = parts.find(
    (p) => /(?:동|町|丁目)$/u.test(p) && p !== labelKo,
  );
  const bits = [
    si
      ?.replace(/(?:특별시|광역시|특별자치시|특별자치도)/u, "")
      .trim() ?? null,
    gu ?? null,
    dong && dong !== labelKo ? dong : null,
  ].filter(Boolean) as string[];
  if (bits.length > 0) return bits.join(" · ");
  return parts.slice(1, 4).join(" · ") || display;
}

function fromNominatim(hit: NominatimHit): AddressLocateCandidate {
  const osmKey = hit.osmId
    ? `${hit.osmType ?? "node"}-${hit.osmId}`
    : hit.placeId;
  return {
    id: `geo:osm:${osmKey}`,
    labelKo: hit.labelKo,
    subtitleKo: regionSubtitleFromDisplay(hit.displayName, hit.labelKo),
    lat: hit.lat,
    lng: hit.lng,
    addressKo: hit.displayName,
    provider: "nominatim",
  };
}

function dedupeNear(
  items: AddressLocateCandidate[],
  meters = 120,
): AddressLocateCandidate[] {
  const out: AddressLocateCandidate[] = [];
  for (const item of items) {
    const clash = out.find(
      (o) =>
        haversineKm(
          { lat: o.lat, lng: o.lng },
          { lat: item.lat, lng: item.lng },
        ) *
          1000 <
        meters,
    );
    if (clash) continue;
    out.push(item);
  }
  return out;
}

function sortByOrigin(
  items: AddressLocateCandidate[],
  origin: { lat: number; lng: number } | null,
): AddressLocateCandidate[] {
  if (!origin) return items;
  return [...items].sort(
    (a, b) =>
      haversineKm(origin, { lat: a.lat, lng: a.lng }) -
      haversineKm(origin, { lat: b.lat, lng: b.lng }),
  );
}

/**
 * Address → candidate list (0..N). Caller shows picker when N≥2.
 */
export async function resolveAddressLocateCandidates(input: {
  readonly query: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly maxResults?: number;
}): Promise<readonly AddressLocateCandidate[]> {
  const query = input.query.trim().replace(/\s+/gu, " ");
  if (!query || !isStreetAddressQuery(query)) {
    return [];
  }

  const maxResults = Math.min(8, Math.max(1, input.maxResults ?? 6));
  const origin =
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
      ? { lat: input.lat, lng: input.lng }
      : null;

  const collected: AddressLocateCandidate[] = [];
  const countrycodes = inferAddressCountryCodes(query);

  // KR: Naver Local first when configured
  if (isKoreanAddressQuery(query) && isNaverSearchConfigured()) {
    try {
      const naver = await fetchNaverLocalPlaceCandidates({
        query,
        display: 12,
      });
      for (const c of naver) {
        if (c.lat == null || c.lng == null) continue;
        const address = (c.address ?? c.name).trim();
        if (!address) continue;
        collected.push({
          id: `geo:naver:${c.place_id}`,
          labelKo: c.name.trim() || query,
          subtitleKo:
            address.length > 42 ? `${address.slice(0, 41)}…` : address,
          lat: c.lat,
          lng: c.lng,
          addressKo: address,
          provider: "naver",
        });
      }
    } catch {
      /* Nominatim */
    }
  }

  const nominatim = await nominatimAutocomplete(query, maxResults);
  for (const hit of nominatim) {
    collected.push(fromNominatim(hit));
  }

  // If still thin, try without country filter (ambiguous place names)
  if (collected.length < 2 && countrycodes) {
    const worldwide = await nominatimAutocomplete(query, maxResults);
    for (const hit of worldwide) {
      collected.push(fromNominatim(hit));
    }
  }

  // Optional Google Places vendor
  if (collected.length < 2) {
    try {
      const googleHits = await findPlacesByName({
        placeName: query,
        userLat: origin?.lat,
        userLng: origin?.lng,
        maxResults,
      });
      for (const g of googleHits) {
        collected.push({
          id: `geo:gplace:${g.google_place_id ?? `${g.lat},${g.lng}`}`,
          labelKo: g.place_name,
          subtitleKo: (g.formatted_address ?? g.place_name).slice(0, 48),
          lat: g.lat,
          lng: g.lng,
          addressKo: g.formatted_address ?? g.place_name,
          provider: "google",
        });
      }
    } catch {
      /* ignore */
    }
  }

  return sortByOrigin(dedupeNear(collected), origin).slice(0, maxResults);
}
