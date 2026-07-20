/**
 * Map SeedPromoteCandidate → EntityCatalogEntry for runtime overlay.
 * Geo / cuisine sectors are skipped (need geocode or other adapters).
 */

import type { EntityCatalogEntry } from "@/lib/entity-resolver/catalogs/catalog-types";
import type { EntityKind } from "@/lib/entity-resolver/types";
import type { SeedPromoteCandidate } from "@/lib/seed-learning/types";
import { normalizeSeedLearningToken } from "@/lib/seed-learning/normalize-seed-token";

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function sectorCatalogMeta(
  sectorId: string,
): { kind: EntityKind; semanticPath: readonly string[] } | null {
  switch (sectorId) {
    case "lodging_brands":
      return {
        kind: "Hotel",
        semanticPath: ["Brand", "LodgingChain", "Hotel"],
      };
    case "cafe_chains":
      return {
        kind: "Brand",
        semanticPath: ["Brand", "CafeChain", "Eatery"],
      };
    case "retail_brands":
      return {
        kind: "Brand",
        semanticPath: ["Brand", "RetailChain"],
      };
    case "amenities":
      return {
        kind: "Location",
        semanticPath: ["Amenity", "Place"],
      };
    case "transport_modes":
      return {
        kind: "Unknown",
        semanticPath: ["Transport", "Mode"],
      };
    case "events":
      return {
        kind: "Unknown",
        semanticPath: ["Event"],
      };
    case "payment":
      return {
        kind: "Product",
        semanticPath: ["Payment", "Method"],
      };
    case "orgs":
      return {
        kind: "Unknown",
        semanticPath: ["Org"],
      };
    default:
      return null;
  }
}

/**
 * Build a dictionary row from a ready promote candidate.
 * Returns null for geo/cuisine (not overlay-safe without geocode).
 */
export function buildCatalogEntryFromPromoteCandidate(
  candidate: SeedPromoteCandidate,
): EntityCatalogEntry | null {
  if (candidate.verdict !== "ready") {
    return null;
  }
  const meta = sectorCatalogMeta(candidate.sectorId);
  if (!meta) {
    return null;
  }
  const token = normalizeSeedLearningToken(candidate.token) || candidate.token.trim();
  if (!token || token.length < 2) {
    return null;
  }
  const slug = token
    .toLowerCase()
    .replace(/\s+/gu, "-")
    .replace(/[^\w\uac00-\ud7a3-]+/gu, "")
    .slice(0, 40);
  const patternSource = escapeRegex(token);
  return {
    id: `promote:${candidate.sectorId}:${slug}`,
    labelKo: token,
    queryKo: token,
    kind: meta.kind,
    pattern: new RegExp(patternSource, "iu"),
    aliases: [token],
    semanticPath: meta.semanticPath,
    confidence: 0.86,
  };
}
