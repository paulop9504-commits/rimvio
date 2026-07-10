import type { AirbnbLodgingSearchInput } from "@/lib/globe/context-hub/providers/airbnb/types";

const MAP_BBOX_DELTA = 0.04;

/** Partner handoff — Airbnb search URL with stay window + map bounds when available. */
export function buildAirbnbLodgingSearchUrl(input: AirbnbLodgingSearchInput): string {
  const query = input.query.trim() || "숙소";
  const params = new URLSearchParams({
    query,
  });

  const checkIn = input.checkInYmd?.trim();
  const checkOut = input.checkOutYmd?.trim();
  if (checkIn) {
    params.set("checkin", checkIn);
  }
  if (checkOut) {
    params.set("checkout", checkOut);
  }
  if (input.adults != null && input.adults > 0) {
    params.set("adults", String(Math.round(input.adults)));
  }

  const lat = input.lat;
  const lng = input.lng;
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    params.set("search_by_map", "true");
    params.set("ne_lat", String(lat + MAP_BBOX_DELTA));
    params.set("ne_lng", String(lng + MAP_BBOX_DELTA));
    params.set("sw_lat", String(lat - MAP_BBOX_DELTA));
    params.set("sw_lng", String(lng - MAP_BBOX_DELTA));
  }

  return `https://www.airbnb.com/s/homes?${params.toString()}`;
}
