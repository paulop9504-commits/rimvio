import { activitySearchEnginePackage } from "@/lib/engine/packages/activity-search-package";
import { financePrepEnginePackage } from "@/lib/engine/packages/finance-prep-package";
import { flightBookingEnginePackage } from "@/lib/engine/packages/flight-booking-package";
import { lodgingSearchEnginePackage } from "@/lib/engine/packages/lodging-search-package";
import { localAmenitySearchEnginePackage } from "@/lib/engine/packages/local-amenity-search-package";
import { eaterySearchEnginePackage } from "@/lib/engine/packages/eatery-search-package";
import { transitNavigateEnginePackage } from "@/lib/engine/packages/transit-navigate-package";
import { tripExperienceSearchEnginePackage } from "@/lib/engine/packages/trip-experience-search-package";
import type { RimvioEnginePackage } from "@/lib/engine/engine-package";

export const RIMVIO_FIRST_PARTY_ENGINE_PACKAGES: readonly RimvioEnginePackage[] = [
  flightBookingEnginePackage,
  lodgingSearchEnginePackage,
  localAmenitySearchEnginePackage,
  eaterySearchEnginePackage,
  activitySearchEnginePackage,
  tripExperienceSearchEnginePackage,
  transitNavigateEnginePackage,
  financePrepEnginePackage,
] as RimvioEnginePackage[];

export {
  activitySearchEnginePackage,
  financePrepEnginePackage,
  flightBookingEnginePackage,
  lodgingSearchEnginePackage,
  localAmenitySearchEnginePackage,
  eaterySearchEnginePackage,
  transitNavigateEnginePackage,
  tripExperienceSearchEnginePackage,
};
