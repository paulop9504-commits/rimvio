export type {
  LocationAdminParts,
  LocationEntity,
  LocationProviderId,
  LocationResolveResult,
} from "@/lib/location-engine/types";
export {
  resolveLocationFromText,
  resolveLocationFromCoords,
  suggestLocationsFromText,
} from "@/lib/location-engine/resolve-location";
export {
  nominatimGeocode,
  nominatimReverseGeocode,
  nominatimAutocomplete,
} from "@/lib/location-engine/providers/nominatim";
export {
  normalizeNominatimHit,
  normalizeRealityGraphText,
  normalizeRealityGraphCoords,
} from "@/lib/location-engine/normalize-to-location-entity";
