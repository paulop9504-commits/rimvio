import { AIRPORT_CATALOG } from "@/lib/entity-resolver/catalogs/airports";
import { AMENITY_CATALOG } from "@/lib/entity-resolver/catalogs/amenities";
import { CAFE_CHAIN_CATALOG } from "@/lib/entity-resolver/catalogs/cafe-chains";
import { EVENT_CATALOG } from "@/lib/entity-resolver/catalogs/events";
import { LANDMARK_CATALOG } from "@/lib/entity-resolver/catalogs/landmarks";
import { LODGING_BRAND_CATALOG } from "@/lib/entity-resolver/catalogs/lodging-brands";
import { matchCatalogEntries } from "@/lib/entity-resolver/catalogs/match-catalog";
import { ORG_CATALOG } from "@/lib/entity-resolver/catalogs/orgs";
import { PAYMENT_CATALOG } from "@/lib/entity-resolver/catalogs/payment";
import { readPromotedCatalogOverlay } from "@/lib/entity-resolver/catalogs/promoted-overlay-store";
import { RETAIL_BRAND_CATALOG } from "@/lib/entity-resolver/catalogs/retail-brands";
import { STATION_CATALOG } from "@/lib/entity-resolver/catalogs/stations";
import { TRANSPORT_MODE_CATALOG } from "@/lib/entity-resolver/catalogs/transport-modes";
import type { ResolvedEntity } from "@/lib/entity-resolver/types";

/** All P1–P3 dictionary catalogs (food brand / cuisine stay in dedicated adapters). */
export const ENTITY_DICTIONARY_CATALOGS = [
  STATION_CATALOG,
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
] as const;

export function resolveDictionaryCatalogEntities(
  text: string,
): ResolvedEntity[] {
  const out: ResolvedEntity[] = [];
  for (const catalog of ENTITY_DICTIONARY_CATALOGS) {
    out.push(...matchCatalogEntries(text, catalog));
  }
  // Runtime promote overlay — after static seeds (static wins on equal span).
  const overlay = readPromotedCatalogOverlay();
  if (overlay.length > 0) {
    out.push(...matchCatalogEntries(text, overlay));
  }
  return out;
}

export {
  STATION_CATALOG,
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
};
