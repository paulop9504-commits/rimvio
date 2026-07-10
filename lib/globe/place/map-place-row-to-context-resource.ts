import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextResource } from "@/lib/globe/resource/types";
import type { ContextPlaceInventoryRow } from "@/lib/globe/place/place-resource-types";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

function formatPriceLevel(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const level = Math.min(4, Math.max(1, Math.round(value)));
  return "₩".repeat(level);
}

function actionLabelKo(kind: ContextConditionRecommendation["kind"]): string {
  if (kind === "activity") {
    return "길찾기";
  }
  if (kind === "amenity") {
    return "바로 가기";
  }
  return "길찾기";
}

/** Map scout inventory row → committed ContextResource (`:activity:` / `:amenity:`). */
export function mapPlaceRowToContextResource(
  event: EventCandidate,
  row: ContextPlaceInventoryRow,
  kind: "activity" | "amenity",
): ContextResource {
  const payload = {
    placeId: row.placeId,
    name: row.name,
    images: row.images,
    address: row.address ?? null,
    cuisineHint: row.cuisineHint ?? null,
    priceLevel: row.priceLevel ?? null,
    rating: row.rating ?? null,
    openNow: row.openNow ?? null,
    mapsUrl: row.mapsUrl ?? null,
    provider: row.provider ?? null,
    providerLabel: row.providerLabel ?? null,
    categoryLabel: row.categoryLabel ?? null,
    specialReasonKo: row.specialReasonKo ?? null,
    specialScore: row.specialScore ?? null,
    searchScore: row.searchScore ?? null,
    virtualCandidate: row.virtualCandidate === true ? true : undefined,
  };

  return {
    resourceId: `${event.id}:${kind}:${row.placeId}`,
    contextEventId: event.id,
    kind: "ticket",
    sourceHubId: kind,
    label: row.name,
    shortLabel: row.categoryLabel?.trim() || formatPriceLevel(row.priceLevel),
    spacetime: {
      lat: row.lat,
      lng: row.lng,
      placeLabel: row.name,
      validFromIso: event.datetime ?? null,
      validUntilIso: null,
    },
    action: {
      kind: "open_url",
      href:
        row.mapsUrl?.trim() ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}&query_place_id=${encodeURIComponent(row.placeId)}`,
      labelKo: actionLabelKo(kind),
    },
    createdAtIso: event.updatedAt ?? event.createdAt,
    updatedAtIso: event.updatedAt ?? null,
    metadata: { place: payload, domainKind: kind },
  };
}
