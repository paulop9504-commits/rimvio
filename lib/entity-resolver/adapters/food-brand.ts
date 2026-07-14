import { parseFoodBrandFocus } from "@/lib/globe/context-condition-ai/parse-food-brand-focus";
import { semanticPathForBrand } from "@/lib/entity-resolver/semantic-layer";
import type { ResolvedEntity } from "@/lib/entity-resolver/types";

/** Dictionary brand NER → ResolvedEntity. */
export function resolveBrandEntities(text: string): ResolvedEntity[] {
  const brand = parseFoodBrandFocus(text);
  if (!brand) {
    return [];
  }
  const match = text.match(new RegExp(brand.queryKo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "iu"))
    ?? text.match(/맥도날드|맥날|mcdonald'?s?|マクドナルド|버거킹|burger\s*king|kfc|스타벅스|starbucks|롯데리아/iu);
  const start = match?.index ?? 0;
  const end = start + (match?.[0]?.length ?? brand.queryKo.length);
  return [
    {
      id: `brand:${brand.id}`,
      kind: "Brand",
      label: brand.labelKo,
      aliases: brand.matchAliases,
      semanticPath: semanticPathForBrand(brand.id),
      confidence: 0.96,
      source: "dictionary",
      span: { start, end },
      queryFocus: brand.queryKo,
    },
  ];
}
