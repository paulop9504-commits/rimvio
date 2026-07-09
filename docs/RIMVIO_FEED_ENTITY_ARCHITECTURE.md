# Rimvio Feed Entity Architecture

**L2:** Feed Entity Pipeline · **L3:** `lib/globe/feed-entity/`

> 입력 → 엔티티 분류 → 스키마 로드 → 추출·정규화 → 인벤토리 저장 → 무한 피드

## Pipeline

```
User query ("오사카 라면 맛집")
  ↓ ① classifyDiscoveryEntityQuery()
Entity kind: restaurant · location: 오사카 · detail: 라면
  ↓ ② readEntityDataSchema(entityKind)
Priority slots + review categories + extraction focus
  ↓ ③ Scout / providers (existing)
runContextConditionAnchorPin → commitContextConditionHubBatch
  ↓ ④ Structured inventory (event metadata)
contextLodgingInventory · contextEateryInventory (+ activity via eatery channel)
  ↓ ⑤ buildFeedEntityProfile()
Map inventory rows → slot wires + completeness %
  ↓ ⑥ buildInfiniteDiscoveryFeedCards()
InfiniteDiscoveryFeedCard + profile layer
  ↓ ⑦ GlobeInfiniteDiscoveryFeedPanel
Photos · 맥락 · priority chips · review focus · 꿀팁
```

## Entity kinds

| Kind | Scout/reel mapping | Schema focus |
|------|-------------------|--------------|
| `hotel` | `lodging` | room photos, location, price, amenities, video |
| `restaurant` | `eatery` (default) | food photos, menu, taste reviews, hours |
| `cafe` | `eatery` + cafe cues | ambiance, wifi, noise, seating |
| `shopping` | `activity` + shopping subtype | products, price, variety |
| `attraction` | `activity` / `amenity` | photos, access, crowd, tickets, video |

## Code map

| Step | Module |
|------|--------|
| ① Classify | `classify-discovery-entity-query.ts` |
| ② Schema SSOT | `entity-data-schemas.ts` |
| Reel → kind | `resolve-discovery-entity-kind-from-reel.ts` |
| ③–④ Scout store | `run-context-condition-anchor-pin.ts` · `commit-context-condition-hub-batch.ts` |
| ⑤ Profile | `build-feed-entity-profile.ts` |
| ⑥ Feed cards | `build-infinite-discovery-feed-cards.ts` |
| ⑦ UI | `globe-infinite-discovery-feed-panel.tsx` |

## Phase 2 (LLM extraction)

Deterministic classification and slot filling ship first. Next:

- `smart_schema_builder()` → Operator turn when user intent is situational ("가족 4명 조용한 카페")
- Provider extractors per `EntityDataSlotId` (menu OCR, review category LLM, freshness scoring)
- Dedicated `contextPlaceInventory` metadata key for activity/amenity (today: eatery channel multiplex)

## User-value checklist (lodging · eatery)

See product notes in scout gate enrichment (`build-scout-feed-gate-enrichment.ts`) and per-entity `feedEntityPracticalTips` in `lib/copy/human-ko.ts`.

**Lodging:** room photos · location/transit · price · categorized reviews · video tour  
**Eatery:** food photos · menu · taste reviews · hours · wait · honest negatives  
**Cafe:** ambiance · wifi/noise · work-fit tips  
**Attraction:** route video · crowd timing · tickets · access

## Tests

```bash
npx tsx scripts/test-feed-entity-pipeline.ts
```
