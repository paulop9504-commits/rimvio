import { copy } from "@/lib/copy/human-ko";
import type {
  GlobeResourceReelItem,
  GlobeResourceReelKind,
} from "@/lib/globe/resource-reel/types";

export type ResourceReelKindFilter = "all" | GlobeResourceReelKind;

const PRIMARY_KIND_ORDER: readonly GlobeResourceReelKind[] = [
  "activity",
  "eatery",
  "lodging",
];

function kindLabel(kind: GlobeResourceReelKind): string {
  switch (kind) {
    case "activity":
      return copy.globe.resourceReelFilterActivity;
    case "eatery":
      return copy.globe.resourceReelFilterEatery;
    case "lodging":
      return copy.globe.resourceReelFilterLodging;
    case "amenity":
      return copy.globe.resourceReelFilterAmenity;
  }
}

export function countResourceReelItemsByKind(
  items: readonly GlobeResourceReelItem[],
): Record<GlobeResourceReelKind, number> {
  const counts: Record<GlobeResourceReelKind, number> = {
    activity: 0,
    eatery: 0,
    lodging: 0,
    amenity: 0,
  };
  for (const item of items) {
    counts[item.kind] += 1;
  }
  return counts;
}

/** Amenity stays in "전체" unless it is a meaningful slice on its own. */
export function shouldExposeAmenityReelChip(input: {
  counts: Record<GlobeResourceReelKind, number>;
}): boolean {
  const amenity = input.counts.amenity;
  if (amenity < 2) {
    return false;
  }
  const primaryTotal =
    input.counts.activity + input.counts.eatery + input.counts.lodging;
  if (primaryTotal === 0) {
    return true;
  }
  return amenity >= 3 && amenity >= Math.ceil(primaryTotal * 0.25);
}

export function buildResourceReelKindFilters(
  items: readonly GlobeResourceReelItem[],
): Array<{ id: ResourceReelKindFilter; label: string; count: number }> {
  if (items.length === 0) {
    return [];
  }
  const counts = countResourceReelItemsByKind(items);
  const chips: Array<{ id: ResourceReelKindFilter; label: string; count: number }> = [
    { id: "all", label: copy.globe.resourceReelFilterAll, count: items.length },
  ];
  for (const kind of PRIMARY_KIND_ORDER) {
    const count = counts[kind];
    if (count <= 0) {
      continue;
    }
    chips.push({ id: kind, label: kindLabel(kind), count });
  }
  if (shouldExposeAmenityReelChip({ counts })) {
    chips.push({
      id: "amenity",
      label: kindLabel("amenity"),
      count: counts.amenity,
    });
  }
  return chips;
}

export function filterGlobeResourceReelItems(
  items: readonly GlobeResourceReelItem[],
  kindFilter: ResourceReelKindFilter,
): GlobeResourceReelItem[] {
  if (kindFilter === "all") {
    return [...items];
  }
  return items.filter((item) => item.kind === kindFilter);
}

/**
 * Keep the requested filter even when the slice is empty.
 * Silent widen-to-"all" used to show trip activities after a 「맛집만」 reply.
 */
export function resolveResourceReelKindFilter(
  items: readonly GlobeResourceReelItem[],
  kindFilter: ResourceReelKindFilter,
): ResourceReelKindFilter {
  void items;
  return kindFilter;
}
