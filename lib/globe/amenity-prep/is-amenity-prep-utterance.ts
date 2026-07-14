/**
 * Everyday amenity / POI prep — pharmacy · convenience · ATM …
 * Engine SKU: local_amenity_search
 */

import { isInstantPoiSearch, resolveInstantPoiFocus } from "@/lib/globe/context-condition-ai/instant-poi-search";
import { resolveLocalDiscoveryDomain } from "@/lib/globe/context-condition-ai/resolve-local-discovery-domain";

const AMENITY_CUE =
  /(?:약국|편의점|atm|은행|병원|의원|주유|마트|슈퍼|세탁|우체국|pharmacy|convenience|hospital)/iu;

/** Amenity scout utterance — instant POI or amenity-domain cue. */
export function isAmenityPrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (isInstantPoiSearch(trimmed)) {
    return true;
  }
  if (resolveLocalDiscoveryDomain(trimmed) === "amenity") {
    return true;
  }
  return AMENITY_CUE.test(trimmed) && /(?:찾|근처|주변|어디|보여|알려|search|nearby)/iu.test(trimmed);
}
