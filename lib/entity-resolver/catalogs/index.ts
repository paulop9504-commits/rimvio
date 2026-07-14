import { AIRPORT_CATALOG } from "@/lib/entity-resolver/catalogs/airports";
import { AMENITY_CATALOG } from "@/lib/entity-resolver/catalogs/amenities";
import { CAFE_CHAIN_CATALOG } from "@/lib/entity-resolver/catalogs/cafe-chains";
import { EVENT_CATALOG } from "@/lib/entity-resolver/catalogs/events";
import { LANDMARK_CATALOG } from "@/lib/entity-resolver/catalogs/landmarks";
import { LODGING_BRAND_CATALOG } from "@/lib/entity-resolver/catalogs/lodging-brands";
import { matchCatalogEntries } from "@/lib/entity-resolver/catalogs/match-catalog";
import { ORG_CATALOG } from "@/lib/entity-resolver/catalogs/orgs";
import { PAYMENT_CATALOG } from "@/lib/entity-resolver/catalogs/payment";
import { RETAIL_BRAND_CATALOG } from "@/lib/entity-resolver/catalogs/retail-brands";
import { TRANSPORT_MODE_CATALOG } from "@/lib/entity-resolver/catalogs/transport-modes";
import type { ResolvedEntity } from "@/lib/entity-resolver/types";

/** All P1–P3 dictionary catalogs (food brand / cuisine stay in dedicated adapters). */
export const ENTITY_DICTIONARY_CATALOGS = [
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
  return out;
}

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
};
