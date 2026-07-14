# Rimvio Entity Resolver (scout)

**Law:** never send raw tokens to Intent — `Natural Language → Entity Resolver → Intent axes → Planner/scout`.

## Pipeline (sync v1)

```
Tokenizer → NER → Alias → KG Lookup → Type Resolver → Context Resolver
```

SSOT: `lib/entity-resolver/` · `resolveEntities(text)`.

## Dictionaries (priority)

| P | Catalog | Path examples |
|---|---------|----------------|
| 1 | Landmark / Airport / Lodging brand / Cuisine | Landmark→POI; Airport→Transit→Air; Brand→HotelChain→Lodging |
| 2 | Cafe chain / Retail / Amenity / Transport | CafeChain→Eatery; Retail→Amenity (**not** Eatery) |
| 3 | Event / Payment / Org (sparse) | Event→Festival; Payment→Finance |

Catalog files: `lib/entity-resolver/catalogs/*`. Food fast-food brands remain in `parse-food-brand-focus`; dishes in `parse-cuisine-candidates`.

## Semantic examples

| Surface | Kind | semanticPath |
|---------|------|----------------|
| 맥도날드 | Brand | Brand → RestaurantChain → FastFood → Eatery |
| 힐튼 / 도요코인 | Hotel | Brand → HotelChain → Lodging |
| 유니클로 | Brand | Brand → Retail → Clothing → Amenity |
| 도쿄역 | Station | Station → Transit → Railway |
| 나리타 | Airport | Airport → Transit → Air |
| USJ | Location | Landmark → ThemePark → POI |
| 말차 (bare) | Food + candidates | Tea → Drink → DessertIngredient |
| 말차 아이스크림 | Dessert | Dessert → Food → Eatery |

## Confidence / expansion

Dictionary-first — **no ML training**. New words = new catalog rows (aliases + semanticPath + optional `geoId`).

Ambiguous foods keep `candidates[]` when top-two gap &lt; `ENTITY_AMBIGUITY_GAP`.

## Wire

- classify — Lodging brand → lodging only; Eatery brand → eatery only; Retail ≠ eatery
- discovery origin — Station → Airport → Landmark `geoId`
- Reality Graph seeds for NRT/HND/KIX/ICN/GMP + major JP landmarks
- **Instant Carry S3** — near-capable entities → Floor 1「근처」lanes (`lib/globe/instant-carry/`)
