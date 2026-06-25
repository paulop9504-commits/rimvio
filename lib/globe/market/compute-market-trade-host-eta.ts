import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

/** Urban drive ~25 km/h for ETA hint (experiment — no routing API). */
const ETA_KMH = 25;
const GUEST_LOCATION_STALE_MS = 10 * 60 * 1000;
const ARRIVAL_RADIUS_KM = 0.2;

export type MarketTradeHostEta = {
  distanceKm: number;
  etaMinutes: number;
  arrived: boolean;
  stale: boolean;
};

export function computeMarketTradeHostEta(input: {
  guestLat: number | null;
  guestLng: number | null;
  guestLocationAtIso: string | null;
  anchorLat: number | null;
  anchorLng: number | null;
  now?: Date;
}): MarketTradeHostEta | null {
  const { guestLat, guestLng, anchorLat, anchorLng } = input;
  if (
    guestLat == null ||
    guestLng == null ||
    anchorLat == null ||
    anchorLng == null
  ) {
    return null;
  }

  const at = input.guestLocationAtIso
    ? Date.parse(input.guestLocationAtIso)
    : NaN;
  const now = input.now ?? new Date();
  const stale =
    !Number.isFinite(at) || now.getTime() - at > GUEST_LOCATION_STALE_MS;

  const distanceKm = haversineKm(guestLat, guestLng, anchorLat, anchorLng);
  const arrived = distanceKm <= ARRIVAL_RADIUS_KM;
  const etaMinutes = arrived
    ? 0
    : Math.max(1, Math.round((distanceKm / ETA_KMH) * 60));

  return {
    distanceKm,
    etaMinutes,
    arrived,
    stale,
  };
}

export function formatMarketTradeHostEtaLabel(
  eta: MarketTradeHostEta,
  copy: {
    arrived: string;
    eta: (minutes: number, distanceKm: number) => string;
    stale: string;
  },
): string {
  if (eta.stale) {
    return copy.stale;
  }
  if (eta.arrived) {
    return copy.arrived;
  }
  return copy.eta(eta.etaMinutes, Math.round(eta.distanceKm * 10) / 10);
}
