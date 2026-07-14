import type { EntityCatalogEntry } from "@/lib/entity-resolver/catalogs/catalog-types";

/** P3 — Events / festivals. */
export const EVENT_CATALOG: readonly EntityCatalogEntry[] = [
  {
    id: "event:fireworks",
    labelKo: "불꽃놀이",
    queryKo: "불꽃놀이",
    kind: "Location",
    pattern: /불꽃\s*놀이|fireworks|花火/iu,
    aliases: ["花火大会", "fireworks"],
    semanticPath: ["Event", "Festival", "Seasonal"],
    confidence: 0.88,
  },
  {
    id: "event:matsuri",
    labelKo: "마쓰리",
    queryKo: "마쓰리",
    kind: "Location",
    pattern: /마쓰리|matsuri|祭り|축제/iu,
    aliases: ["祭り", "festival"],
    semanticPath: ["Event", "Festival", "Local"],
    confidence: 0.86,
  },
  {
    id: "event:sakura",
    labelKo: "벚꽃",
    queryKo: "벚꽃",
    kind: "Location",
    pattern: /벚꽃|sakura|cherry\s*blossom|花見/iu,
    aliases: ["花見", "sakura"],
    semanticPath: ["Event", "Seasonal", "Nature"],
    confidence: 0.87,
  },
];
