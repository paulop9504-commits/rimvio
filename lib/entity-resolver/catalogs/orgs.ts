import type { EntityCatalogEntry } from "@/lib/entity-resolver/catalogs/catalog-types";

/**
 * P3 — Sparse org/person dictionary (low recall by design).
 * Prefer link enrichment later; keep only high-confidence travel-adjacent orgs.
 */
export const ORG_CATALOG: readonly EntityCatalogEntry[] = [
  {
    id: "org:jr-east",
    labelKo: "JR East",
    queryKo: "JR East",
    kind: "Product",
    pattern: /jr\s*east|동일본\s*여객|JR東日本/iu,
    aliases: ["JR東日本"],
    semanticPath: ["Company", "Rail", "Operator"],
    confidence: 0.88,
  },
  {
    id: "org:jal",
    labelKo: "JAL",
    queryKo: "JAL",
    kind: "Product",
    pattern: /\bjal\b|일본항공|japan\s*airlines/iu,
    aliases: ["Japan Airlines"],
    semanticPath: ["Company", "Airline", "Transport"],
    confidence: 0.9,
  },
  {
    id: "org:ana",
    labelKo: "ANA",
    queryKo: "ANA",
    kind: "Product",
    pattern: /\bana\b|전일본공수|all\s*nippon/iu,
    aliases: ["All Nippon Airways"],
    semanticPath: ["Company", "Airline", "Transport"],
    confidence: 0.9,
  },
];
