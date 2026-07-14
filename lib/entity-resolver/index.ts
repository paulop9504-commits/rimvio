export { normalizeScoutUtterance } from "@/lib/entity-resolver/normalize-scout-utterance";
export type {
  EntityKind,
  EntityKindCandidate,
  EntityResolveResult,
  EntityResolveSource,
  ResolvedEntity,
} from "@/lib/entity-resolver/types";
export { ENTITY_AMBIGUITY_GAP } from "@/lib/entity-resolver/types";
export {
  resolveEntities,
  entitiesImplyEatery,
  entitiesImplyLodging,
  entitiesImplyAmenity,
  entitiesImplyLandmark,
  findStationEntity,
  findAirportEntity,
  findLandmarkEntity,
  findBrandEntity,
  findLodgingEntity,
  findDishEntity,
  findSpatialOriginEntity,
  queryFocusFromEntities,
} from "@/lib/entity-resolver/resolve-entities";
export {
  semanticPathForBrand,
  brandImpliesEatery,
  entityPathImpliesEatery,
  pathImpliesLodging,
  pathImpliesRetail,
  pathImpliesAmenity,
  pathImpliesLandmark,
  STATION_SEMANTIC_PATH,
  AIRPORT_SEMANTIC_PATH,
  MATCHA_CANDIDATES_BARE,
} from "@/lib/entity-resolver/semantic-layer";
export {
  LANDMARK_CATALOG,
  AIRPORT_CATALOG,
  LODGING_BRAND_CATALOG,
  CAFE_CHAIN_CATALOG,
  RETAIL_BRAND_CATALOG,
  AMENITY_CATALOG,
  TRANSPORT_MODE_CATALOG,
  EVENT_CATALOG,
  PAYMENT_CATALOG,
  ORG_CATALOG,
} from "@/lib/entity-resolver/catalogs";
