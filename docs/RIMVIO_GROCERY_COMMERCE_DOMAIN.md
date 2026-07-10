# Grocery / commerce domain — dish → cart → channel

**Parent Context:** Trip Experience or home Context  
**L2:** Recipe decomposition → cart Blueprint → Hub channel rank → Commit  
**L3:** `lib/globe/grocery-prep/`  
**North-star:** `찜닭 만들 거야, 식자재 장봐줘`

## 1. Pipeline (lodging one-shot isomorphic)

| Step | Lodging | Grocery |
|------|---------|---------|
| Detect | `isLodgingPrepUtterance` | `isGroceryPrepUtterance` |
| Parse spatial | neighborhood POV | delivery radius / store POV |
| Merge intake | trip + stay window | servings + pantry vault |
| Infer entity | hotel MAIN | `dish → ingredients[]` |
| ask_chips | dates · budget | 부위 · 브랜드 · 수량 |
| scout | LiteAPI rates | SKU / live / mart API |
| MAIN | rank-1 room | cart bundle |
| checkout | express pay | express pay |

## 2. Dish decomposition (deterministic MVP)

```
찜닭 → [ 닭, 감자, 당면, 양파, 대파, 마늘, 고추장, 간장, 설탕, 후추 ]
```

Phase A: static recipe map in `infer-grocery-ingredients-from-dish.ts`  
Phase B: LLM fallback with structured JSON schema (no raw HTML in UI)

## 3. Live commerce

When partner is onboarded as Hub resource:

- Orchestrator scores **price + delivery ETA + min order + user subscription**
- Surface one card: 「라이브 ○○ — 지금 ○% · 이걸로 갈까?」
- User confirm → Commit (same as lodging express)

## 4. Tests

```bash
npx tsx scripts/test-grocery-prep-plan.ts
```

## 5. Wiring status

| Item | Status |
|------|--------|
| `planOneShotGroceryPrep` | Phase A (pure) |
| Operator ask_chips | Phase B |
| Hub SKU APIs | Frozen until `@` registry grocery contract |
