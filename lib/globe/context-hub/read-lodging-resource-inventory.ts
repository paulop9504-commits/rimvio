import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type {
  ContextLodgingInventoryRow,
  LodgingResourcePayload,
  LodgingStayWindow,
} from "@/lib/globe/context-hub/lodging-resource-types";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { buildLodgingStayWindow } from "@/lib/globe/context-hub/lodging-stay-window";
import { resolveContextLodgingDestinationAnchor } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import type { ContextResource } from "@/lib/globe/resource/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { buildGoogleMapsPlaceHref } from "@/lib/resolvers/deep-links";

const LODGING_ANCHOR_TOLERANCE_KM = 30;

function parseStayWindowValue(value: unknown): LodgingStayWindow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  const confidence: LodgingStayWindow["confidence"] =
    row.confidence === "confirmed" ||
    row.confidence === "estimated" ||
    row.confidence === "open"
      ? row.confidence
      : undefined;
  return {
    checkInIso: typeof row.checkInIso === "string" ? row.checkInIso : null,
    checkOutIso: typeof row.checkOutIso === "string" ? row.checkOutIso : null,
    nights: typeof row.nights === "number" ? row.nights : null,
    confidence,
  };
}

function readInventoryRows(value: unknown): ContextLodgingInventoryRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: ContextLodgingInventoryRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    const placeId = typeof row.placeId === "string" ? row.placeId.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const lat = typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null;
    const lng = typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null;
    if (!placeId || !name || lat === null || lng === null) {
      continue;
    }
    const images = Array.isArray(row.images)
      ? row.images.filter((src): src is string => typeof src === "string" && src.trim().length > 0)
      : [];
    rows.push({
      placeId,
      name,
      lat,
      lng,
      images,
      videoUrl: typeof row.videoUrl === "string" ? row.videoUrl : null,
      priceKrw: typeof row.priceKrw === "number" ? row.priceKrw : null,
      partnerLabel: typeof row.partnerLabel === "string" ? row.partnerLabel : null,
      address: typeof row.address === "string" ? row.address : null,
      mapsUrl: typeof row.mapsUrl === "string" ? row.mapsUrl : null,
      provider:
        row.provider === "google_places" || row.provider === "mock"
          ? row.provider
          : null,
      photoSource:
        row.photoSource === "google_places_details" ||
        row.photoSource === "google_places_nearby" ||
        row.photoSource === "mock"
          ? row.photoSource
          : null,
      photoConfidence:
        row.photoConfidence === "exact_place_id" ||
        row.photoConfidence === "strong_identity" ||
        row.photoConfidence === "nearby_identity" ||
        row.photoConfidence === "mock"
          ? row.photoConfidence
          : null,
      checkInIso: typeof row.checkInIso === "string" ? row.checkInIso : null,
      checkOutIso: typeof row.checkOutIso === "string" ? row.checkOutIso : null,
      stayWindow: parseStayWindowValue(row.stayWindow),
    });
  }
  return rows;
}

export function readLodgingPayloadFromResource(
  resource: ContextResource,
): LodgingResourcePayload | null {
  const raw = resource.metadata?.lodging;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const placeId = typeof row.placeId === "string" ? row.placeId.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!placeId || !name) {
    return null;
  }
  const images = Array.isArray(row.images)
    ? row.images.filter((src): src is string => typeof src === "string" && src.trim().length > 0)
    : [];
  return {
    placeId,
    name,
    images,
    videoUrl: typeof row.videoUrl === "string" ? row.videoUrl : null,
    priceKrw: typeof row.priceKrw === "number" ? row.priceKrw : null,
    partnerLabel: typeof row.partnerLabel === "string" ? row.partnerLabel : null,
    address: typeof row.address === "string" ? row.address : null,
    mapsUrl: typeof row.mapsUrl === "string" ? row.mapsUrl : null,
    provider:
      row.provider === "google_places" || row.provider === "mock"
        ? row.provider
        : null,
    photoSource:
      row.photoSource === "google_places_details" ||
      row.photoSource === "google_places_nearby" ||
      row.photoSource === "mock"
        ? row.photoSource
        : null,
    photoConfidence:
      row.photoConfidence === "exact_place_id" ||
      row.photoConfidence === "strong_identity" ||
      row.photoConfidence === "nearby_identity" ||
      row.photoConfidence === "mock"
        ? row.photoConfidence
        : null,
    stayWindow: parseStayWindowValue(row.stayWindow),
  };
}

export function isLodgingHubEnabled(event: EventCandidate): boolean {
  return event.metadata?.[CONTEXT_LODGING_HUB_ENABLED_META_KEY] === true;
}

export function readLodgingInventoryRows(
  event: EventCandidate,
): readonly ContextLodgingInventoryRow[] {
  if (!isLodgingHubEnabled(event)) {
    return [];
  }
  return readInventoryRows(event.metadata?.[CONTEXT_LODGING_INVENTORY_META_KEY]);
}

/** Stale seed from wrong anchor (e.g. mock 대전 while context is 상하이). */
export function isLodgingInventoryMisanchored(event: EventCandidate): boolean {
  const rows = readLodgingInventoryRows(event);
  if (rows.length === 0) {
    return false;
  }
  const anchor = resolveContextLodgingDestinationAnchor(event);
  return rows.some(
    (row) =>
      haversineKm(row.lat, row.lng, anchor.lat, anchor.lng) > LODGING_ANCHOR_TOLERANCE_KM,
  );
}

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export function mapLodgingRowToContextResource(
  event: EventCandidate,
  row: ContextLodgingInventoryRow,
): ContextResource {
  const plan = readPlanContextFromEvent(event);
  const stayWindow = buildLodgingStayWindow({ event, row });
  const payload: LodgingResourcePayload = {
    placeId: row.placeId,
    name: row.name,
    images: row.images,
    videoUrl: row.videoUrl ?? null,
    priceKrw: row.priceKrw ?? null,
    partnerLabel: row.partnerLabel ?? null,
    address: row.address ?? null,
    mapsUrl: row.mapsUrl ?? null,
    provider: row.provider ?? null,
    photoSource: row.photoSource ?? null,
    photoConfidence: row.photoConfidence ?? null,
    stayWindow,
  };

  return {
    resourceId: `${event.id}:lodging:${row.placeId}`,
    contextEventId: event.id,
    kind: "lodging_voucher",
    sourceHubId: "lodging",
    label: row.name,
    shortLabel: formatPriceKrw(row.priceKrw),
    spacetime: {
      lat: row.lat,
      lng: row.lng,
      placeLabel: row.name,
      validFromIso: stayWindow?.checkInIso ?? row.checkInIso ?? plan?.windowStartIso ?? event.datetime ?? null,
      validUntilIso: stayWindow?.checkOutIso ?? row.checkOutIso ?? plan?.windowEndIso ?? null,
    },
    action: {
      kind: "open_url",
      href: buildGoogleMapsPlaceHref({
        lat: row.lat,
        lng: row.lng,
        placeId: row.placeId,
        placeLabel: row.name,
      }),
      labelKo: "예매",
    },
    createdAtIso: event.updatedAt ?? event.createdAt,
    updatedAtIso: event.updatedAt ?? null,
    metadata: { lodging: payload },
  };
}

/** Hub factory read — inventory rows → Resource[]. */
export function listLodgingResourcesForEvent(
  event: EventCandidate | null | undefined,
): ContextResource[] {
  if (!event) {
    return [];
  }
  return readLodgingInventoryRows(event).map((row) =>
    mapLodgingRowToContextResource(event, row),
  );
}
