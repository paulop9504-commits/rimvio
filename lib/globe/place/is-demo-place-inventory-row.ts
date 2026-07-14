import type { ContextPlaceInventoryRow } from "@/lib/globe/place/place-resource-types";

/** Korea demo placeholders from queryNearbyPlaces mock fallback. */
export function isDemoPlaceInventoryRow(
  row: Pick<ContextPlaceInventoryRow, "placeId" | "name" | "address">,
): boolean {
  if (row.placeId.startsWith("mock-")) {
    return true;
  }
  if (/현재 위치 도보/.test(row.address ?? "")) {
    return true;
  }
  return /^(근처 공원 산책로|근처 관광명소|지역 박물관)$/u.test(row.name.trim());
}
