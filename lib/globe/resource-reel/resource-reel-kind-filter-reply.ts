import { copy } from "@/lib/copy/human-ko";
import type { ResourceReelKindFilter } from "@/lib/globe/resource-reel/resource-reel-kind-filter";

export function resourceReelKindFilterReplyKo(
  kindFilter: ResourceReelKindFilter,
): string {
  switch (kindFilter) {
    case "all":
      return copy.globe.resourceReelFilterAppliedAll;
    case "activity":
      return copy.globe.resourceReelFilterAppliedActivity;
    case "eatery":
      return copy.globe.resourceReelFilterAppliedEatery;
    case "lodging":
      return copy.globe.resourceReelFilterAppliedLodging;
    case "amenity":
      return copy.globe.resourceReelFilterAppliedAmenity;
  }
}
