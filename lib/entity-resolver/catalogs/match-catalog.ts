import type { EntityCatalogEntry } from "@/lib/entity-resolver/catalogs/catalog-types";
import type { ResolvedEntity } from "@/lib/entity-resolver/types";

export function matchCatalogEntries(
  text: string,
  catalog: readonly EntityCatalogEntry[],
): ResolvedEntity[] {
  const out: ResolvedEntity[] = [];
  for (const row of catalog) {
    const match = text.match(row.pattern);
    if (!match || match.index == null) {
      continue;
    }
    const start = match.index;
    const end = start + match[0].length;
    out.push({
      id: row.id,
      kind: row.kind,
      label: row.labelKo,
      aliases: row.aliases,
      semanticPath: row.semanticPath,
      confidence: row.confidence ?? 0.92,
      source: "dictionary",
      span: { start, end },
      queryFocus: row.queryKo,
      geoId: row.geoId,
    });
  }
  return out;
}
