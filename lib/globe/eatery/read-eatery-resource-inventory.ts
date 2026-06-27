import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ContextEateryInventoryRow,
  EateryResourcePayload,
} from "@/lib/globe/eatery/eatery-resource-types";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
} from "@/lib/globe/eatery/eatery-resource-types";
import type { ContextResource } from "@/lib/globe/resource/types";

function readInventoryRows(value: unknown): ContextEateryInventoryRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: ContextEateryInventoryRow[] = [];
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
      cuisineHint: typeof row.cuisineHint === "string" ? row.cuisineHint : null,
      priceLevel: typeof row.priceLevel === "number" ? row.priceLevel : null,
    });
  }
  return rows;
}

export function readEateryPayloadFromResource(
  resource: ContextResource,
): EateryResourcePayload | null {
  const raw = resource.metadata?.eatery;
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
    cuisineHint: typeof row.cuisineHint === "string" ? row.cuisineHint : null,
    priceLevel: typeof row.priceLevel === "number" ? row.priceLevel : null,
  };
}

export function isEateryHubEnabled(event: EventCandidate): boolean {
  return event.metadata?.[CONTEXT_EATERY_HUB_ENABLED_META_KEY] === true;
}

export function readEateryInventoryRows(
  event: EventCandidate,
): readonly ContextEateryInventoryRow[] {
  if (!isEateryHubEnabled(event)) {
    return [];
  }
  return readInventoryRows(event.metadata?.[CONTEXT_EATERY_INVENTORY_META_KEY]);
}

function formatPriceLevel(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const level = Math.min(4, Math.max(1, Math.round(value)));
  return "₩".repeat(level);
}

export function mapEateryRowToContextResource(
  event: EventCandidate,
  row: ContextEateryInventoryRow,
): ContextResource {
  const payload: EateryResourcePayload = {
    placeId: row.placeId,
    name: row.name,
    images: row.images,
    cuisineHint: row.cuisineHint ?? null,
    priceLevel: row.priceLevel ?? null,
  };

  return {
    resourceId: `${event.id}:eatery:${row.placeId}`,
    contextEventId: event.id,
    kind: "ticket",
    sourceHubId: "eatery",
    label: row.name,
    shortLabel: row.cuisineHint?.trim() || formatPriceLevel(row.priceLevel),
    spacetime: {
      lat: row.lat,
      lng: row.lng,
      placeLabel: row.name,
      validFromIso: event.datetime ?? null,
      validUntilIso: null,
    },
    action: {
      kind: "open_url",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}&query_place_id=${encodeURIComponent(row.placeId)}`,
      labelKo: "길찾기",
    },
    createdAtIso: event.updatedAt ?? event.createdAt,
    updatedAtIso: event.updatedAt ?? null,
    metadata: { eatery: payload },
  };
}

export function listEateryResourcesForEvent(
  event: EventCandidate | null | undefined,
): ContextResource[] {
  if (!event) {
    return [];
  }
  return readEateryInventoryRows(event).map((row) =>
    mapEateryRowToContextResource(event, row),
  );
}
