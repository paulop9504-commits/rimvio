import { resolveKoreaPlaceFromCoords } from "@/lib/globe/korea-place-from-coords";
import {
  hasValidMarketTradeDistrict,
  matchKoreaMetroDistrict,
} from "@/lib/globe/korea-metro-districts";
import { isCoordPlaceLabel } from "@/lib/globe/market/format-market-place-label";
import { sampleEphemeralGpsPlace } from "@/lib/globe/sample-ephemeral-gps-place";

export type MarketIntentPinAnchorInput = {
  placeLabel: string;
  anchorLat: number;
  anchorLng: number;
};

export type MarketIntentPinAnchor = {
  lat: number;
  lng: number;
  placeLabel: string;
  gpsSampled: boolean;
};

const SEOUL_LAT = 37.5665;
const SEOUL_LNG = 126.978;

function readDistrictLabel(placeLabel: string): string | null {
  const trimmed = placeLabel.trim();
  if (!trimmed || isCoordPlaceLabel(trimmed)) {
    return null;
  }
  return hasValidMarketTradeDistrict(trimmed) ? trimmed : null;
}

function labelFromCoords(lat: number, lng: number, fallback = "근처"): string {
  const resolved = resolveKoreaPlaceFromCoords(lat, lng);
  const metro = matchKoreaMetroDistrict(resolved.label);
  const candidate = metro?.label ?? resolved.label ?? fallback;
  return isCoordPlaceLabel(candidate) ? fallback : candidate;
}

/** Map pin = live GPS; place label = chosen 구 or metro near GPS (never raw coords). */
export async function resolveMarketIntentPinAnchor(
  input: MarketIntentPinAnchorInput,
): Promise<MarketIntentPinAnchor> {
  const gps = await sampleEphemeralGpsPlace();
  const districtLabel = readDistrictLabel(input.placeLabel);

  if (gps) {
    const placeLabel = districtLabel ?? labelFromCoords(gps.lat, gps.lng, gps.placeLabel || "근처");
    return {
      lat: gps.lat,
      lng: gps.lng,
      placeLabel,
      gpsSampled: true,
    };
  }

  const hasAnchor =
    Number.isFinite(input.anchorLat) &&
    Number.isFinite(input.anchorLng) &&
    input.anchorLat !== 0 &&
    input.anchorLng !== 0;

  if (hasAnchor) {
    const placeLabel =
      districtLabel ??
      (input.placeLabel.trim() && !isCoordPlaceLabel(input.placeLabel)
        ? input.placeLabel.trim()
        : labelFromCoords(input.anchorLat, input.anchorLng));
    return {
      lat: input.anchorLat,
      lng: input.anchorLng,
      placeLabel,
      gpsSampled: false,
    };
  }

  return {
    lat: SEOUL_LAT,
    lng: SEOUL_LNG,
    placeLabel: districtLabel ?? "근처",
    gpsSampled: false,
  };
}

/** District label for trade matching + GPS coords for map pin. */
export function mergeDistrictLabelWithGpsCoords(input: {
  districtLabel: string;
  districtLat: number;
  districtLng: number;
  gpsLat: number | null | undefined;
  gpsLng: number | null | undefined;
}): { placeLabel: string; lat: number; lng: number } {
  return {
    placeLabel: input.districtLabel,
    lat:
      input.gpsLat != null && Number.isFinite(input.gpsLat)
        ? input.gpsLat
        : input.districtLat,
    lng:
      input.gpsLng != null && Number.isFinite(input.gpsLng)
        ? input.gpsLng
        : input.districtLng,
  };
}
