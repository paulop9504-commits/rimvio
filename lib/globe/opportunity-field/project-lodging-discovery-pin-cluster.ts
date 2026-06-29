import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

export function lodgingDiscoveryGlobePinId(placeId: string): string {
  return `lod:${placeId.trim()}`;
}

export function projectPinClusterFromLodgingRow(
  row: ContextLodgingInventoryRow,
  reasonKo?: string | null,
): PinCluster {
  const pinId = lodgingDiscoveryGlobePinId(row.placeId);
  const priceLine =
    row.priceKrw != null && Number.isFinite(row.priceKrw)
      ? `${Math.round(row.priceKrw / 10_000)}만원대`
      : null;

  return {
    pinId,
    eventId: pinId,
    title: row.name,
    placeLabel: row.name,
    lat: row.lat,
    lng: row.lng,
    dateLabel: null,
    startedAtIso: new Date().toISOString(),
    evidence: {
      photoCount: row.images.length,
      videoCount: row.videoUrl ? 1 : 0,
      chatCount: 0,
      placePinCount: 1,
    },
    recallLine: reasonKo ?? priceLine,
    origin: "external",
    externalTraceId: row.placeId,
    readOnly: true,
    authorDisplayName: null,
  };
}

export function projectLodgingDiscoveryPinClusters(
  rows: readonly ContextLodgingInventoryRow[],
  reasons?: ReadonlyMap<string, string>,
): PinCluster[] {
  return rows.map((row) =>
    projectPinClusterFromLodgingRow(row, reasons?.get(row.placeId) ?? null),
  );
}
