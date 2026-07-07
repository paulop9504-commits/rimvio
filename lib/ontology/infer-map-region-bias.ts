import { inferMapRegionFromCoords } from "@/lib/ontology/geo-region-from-coords";

export type MapRegionBias = "kr" | "jp" | "global";

export function inferMapRegionBias(input: {
  lat?: number | null;
  lng?: number | null;
  areaLabel?: string | null;
}): MapRegionBias {
  const lat = input.lat;
  const lng = input.lng;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    const coordRegion = inferMapRegionFromCoords(lat, lng);
    if (coordRegion) {
      return coordRegion;
    }
  }

  const label = input.areaLabel?.trim() ?? "";
  if (/(도쿄|東京|tokyo|오사카|大阪|osaka|교토|kyoto|후쿠오카|fukuoka|삿포로|sapporo|세타가야|setagaya|일본|japan)/iu.test(label)) {
    return "jp";
  }
  if (/(서울|부산|대전|대구|광주|인천|제주|한국|korea)/iu.test(label)) {
    return "kr";
  }
  return "global";
}
