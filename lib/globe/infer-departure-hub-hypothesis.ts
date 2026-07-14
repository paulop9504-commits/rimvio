import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import {
  DEPARTURE_HUB_AIRPORTS,
  getDepartureHubAirport,
  type DepartureHubAirport,
  type DepartureHubAirportId,
} from "@/lib/globe/departure-hub-airports";

export type DepartureHubConfidence = "high" | "low";

export type DepartureHubHypothesis = {
  readonly hub: DepartureHubAirport;
  readonly homeLabel: string;
  readonly confidence: DepartureHubConfidence;
};

const REGION_CENTERS = {
  busan: { lat: 35.1796, lng: 129.0756, label: "부산", radiusKm: 45 },
  seoul: { lat: 37.5665, lng: 126.978, label: "서울", radiusKm: 55 },
  chungcheong: { lat: 36.635, lng: 127.489, label: "대전", radiusKm: 55 },
} as const;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function readNearestHomeRegion(
  lat: number,
  lng: number,
): { label: string; kind: keyof typeof REGION_CENTERS } | null {
  let best: { label: string; kind: keyof typeof REGION_CENTERS; distanceKm: number } | null =
    null;
  for (const [kind, center] of Object.entries(REGION_CENTERS) as [
    keyof typeof REGION_CENTERS,
    (typeof REGION_CENTERS)[keyof typeof REGION_CENTERS],
  ][]) {
    const distanceKm = haversineKm(lat, lng, center.lat, center.lng);
    if (distanceKm > center.radiusKm) {
      continue;
    }
    if (!best || distanceKm < best.distanceKm) {
      best = { label: center.label, kind, distanceKm };
    }
  }
  return best ? { label: best.label, kind: best.kind } : null;
}

function rankHubIdsForDestination(input: {
  destinationLabel: string;
  homeKind: keyof typeof REGION_CENTERS | null;
}): DepartureHubAirportId[] {
  const overseas = classifyOverseasManualPlace(input.destinationLabel.trim());
  if (input.homeKind === "busan") {
    return overseas?.isOverseas ? ["pus", "icn", "gmp", "cjj"] : ["pus", "gmp", "icn", "cjj"];
  }
  if (input.homeKind === "chungcheong") {
    // Overseas: prefer ICN even from 충청 — CJJ is domestic/short-haul fallback.
    return overseas?.isOverseas
      ? ["icn", "cjj", "gmp", "pus"]
      : ["cjj", "gmp", "icn", "pus"];
  }
  if (input.homeKind === "seoul") {
    return overseas?.isOverseas ? ["icn", "gmp", "cjj", "pus"] : ["gmp", "icn", "cjj", "pus"];
  }
  return overseas?.isOverseas ? ["icn", "gmp", "pus", "cjj"] : ["gmp", "icn", "pus", "cjj"];
}

/** Viewer location + destination → suggested departure hub (deterministic, no LLM). */
export function inferDepartureHubHypothesis(input: {
  destinationLabel: string;
  viewerLat?: number | null;
  viewerLng?: number | null;
}): DepartureHubHypothesis {
  const destinationLabel = input.destinationLabel.trim() || "여행";
  const lat = input.viewerLat;
  const lng = input.viewerLng;
  const home =
    lat != null && lng != null ? readNearestHomeRegion(lat, lng) : null;
  const [primaryId] = rankHubIdsForDestination({
    destinationLabel,
    homeKind: home?.kind ?? null,
  });
  const hub = getDepartureHubAirport(primaryId ?? "icn");
  return {
    hub,
    homeLabel: home?.label ?? "집",
    confidence: home ? "high" : "low",
  };
}

export function listDepartureHubChoices(input: {
  destinationLabel: string;
  viewerLat?: number | null;
  viewerLng?: number | null;
}): DepartureHubAirport[] {
  const lat = input.viewerLat;
  const lng = input.viewerLng;
  const home =
    lat != null && lng != null ? readNearestHomeRegion(lat, lng) : null;
  const order = rankHubIdsForDestination({
    destinationLabel: input.destinationLabel.trim() || "여행",
    homeKind: home?.kind ?? null,
  });
  return order.map((id) => DEPARTURE_HUB_AIRPORTS.find((row) => row.id === id)!);
}
