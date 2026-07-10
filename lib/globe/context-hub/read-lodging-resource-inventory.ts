import { buildContextLodgingBookingHandoff } from "@/lib/globe/context-action-injection/build-context-action-handoff";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
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
import { resolveLodgingRoomOffers } from "@/lib/globe/context-hub/derive-lodging-room-offers";
import { readLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { buildLodgingStayWindow } from "@/lib/globe/context-hub/lodging-stay-window";
import { resolveContextLodgingDestinationAnchor } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import type { ContextResource } from "@/lib/globe/resource/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { resolveLodgingBookingProvider } from "@/lib/globe/context-hub/resolve-lodging-booking-provider";
import type { EventCandidate } from "@/lib/events/event-candidate";

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

function readRoomOffers(value: unknown): LodgingResourcePayload["roomOffers"] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!id || !title) {
        return null;
      }
      return {
        id,
        title,
        occupancyLabelKo:
          typeof row.occupancyLabelKo === "string" ? row.occupancyLabelKo : "",
        priceKrw: typeof row.priceKrw === "number" ? row.priceKrw : null,
        totalPriceKrw:
          typeof row.totalPriceKrw === "number" ? row.totalPriceKrw : null,
        refundable: row.refundable !== false,
        roomCount: typeof row.roomCount === "number" ? row.roomCount : 1,
        guestCount: typeof row.guestCount === "number" ? row.guestCount : 1,
        sourceLabelKo:
          typeof row.sourceLabelKo === "string" ? row.sourceLabelKo : "",
        providerOfferId:
          typeof row.providerOfferId === "string" ? row.providerOfferId : null,
        providerRateId:
          typeof row.providerRateId === "string" ? row.providerRateId : null,
        mappedRoomId:
          typeof row.mappedRoomId === "string" ? row.mappedRoomId : null,
        imageUrls: Array.isArray(row.imageUrls)
          ? row.imageUrls.filter(
              (url): url is string => typeof url === "string" && url.trim().length > 0,
            )
          : undefined,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
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
        row.provider === "google_places" ||
        row.provider === "mock" ||
        row.provider === "liteapi"
          ? row.provider
          : null,
      photoSource:
        row.photoSource === "google_places_details" ||
        row.photoSource === "google_places_nearby" ||
        row.photoSource === "mock" ||
        row.photoSource === "liteapi"
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
      liteapiHotelId:
        typeof row.liteapiHotelId === "string" ? row.liteapiHotelId : null,
      roomOffers: readRoomOffers(row.roomOffers),
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
      row.provider === "google_places" ||
      row.provider === "mock" ||
      row.provider === "liteapi"
        ? row.provider
        : null,
    photoSource:
      row.photoSource === "google_places_details" ||
      row.photoSource === "google_places_nearby" ||
      row.photoSource === "mock" ||
      row.photoSource === "liteapi"
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
    roomOffers: readRoomOffers(row.roomOffers),
    liteapiHotelId:
      typeof row.liteapiHotelId === "string" ? row.liteapiHotelId : null,
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
  const slots = readLodgingBookingSlots(event);
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
    liteapiHotelId: row.liteapiHotelId ?? null,
    roomOffers: resolveLodgingRoomOffers({
      row,
      stayWindow,
      guestCount: slots.guestCount ?? 1,
      roomCount: slots.roomCount ?? 1,
    }),
  };

  const lodgingKind = readContextConditionLastBatch(event.id)?.spec?.lodgingKind ?? "any";
  const bookingHandoff = buildContextLodgingBookingHandoff({
    row,
    event,
    intent: {
      kind: "book_lodging",
      resourceKind: "lodging",
      confidence: 1,
    },
    lodgingKind,
    contextEventId: event.id,
    guestCount: slots.guestCount ?? 1,
  });
  const bookingProvider = resolveLodgingBookingProvider({
    lodgingKind,
    contextEventId: event.id,
  });

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
      href: bookingHandoff.href,
      labelKo: bookingProvider === "airbnb" ? "Airbnb" : "예매",
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
