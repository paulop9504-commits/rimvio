# Trip Experience domain — fun / exploratory travel

**L2 Product:** Experience Intent → Blueprint hypothesis → parallel scout → MAIN per leg  
**L3 Code:** `lib/globe/trip-experience/` · sibling: `lib/globe/lodging-prep/`  
**North-star utterance:** `재미있는 여행하고 싶어`

## 1. When this domain applies

| Signal | Example | Route |
|--------|---------|--------|
| **Trip experience** | 재미있는 여행, 특별한 주말, fun trip | `trip-experience` one-shot |
| **Lodging prep** | 서면쪽 숙소 예약 준비 | `lodging-prep` one-shot |
| **Grocery prep** | 찜닭 만들 거야 장봐줘 | `grocery-prep` (child Action leg) |

Classifier order (Operator gate):

1. `isLodgingPrepUtterance` → lodging ask_chips / scout  
2. `isTripExperienceUtterance` → experience ask_chips / scout  
3. Intent convergence (activity / cafe / date)  
4. `defer_classify`

## 2. Decomposition — `재미있는 여행하고 싶어`

```
Utterance
  └─ affect: fun / discovery          ← 「재미있는」
  └─ domain: trip                     ← implicit
  └─ destination: ∅                   ← hypothesis only after chips
  └─ fun_axis: ∅                      ← food_market | nature | festival | culture
  └─ dates: ∅                         ← merge calendar / 「이번 주말」
  └─ guests / budget: ∅               ← optional; defaults after scout prep
```

**Not extracted as facts:** star ratings, scroll lists, 「관광 코스 10선」.

## 3. Slots (SSOT)

| Slot | Gap id | Filled when |
|------|--------|-------------|
| Fun axis | `fun_axis` | User chip or message cue (시장·먹거리 → `food_market`) |
| Destination scope | `destination_scope` | `domestic_near` · `domestic_far` · `abroad` · `open` |
| Dates | `dates` | check-in/out or window label |
| Guests | `guests` | count ≥ 1 |
| Budget band | `budget` | value / balanced / premium |

Metadata keys: `lib/globe/trip-experience/trip-experience-metadata-keys.ts`

## 4. One-shot pipeline (same shape as lodging)

```
planOneShotTripExperiencePrep
  parse_affect + fun_axis inference
  merge trip temporal (readTripIntakeState)
  assessTripExperienceGaps
  → readyForScout when fun_axis + destination_scope + dates
  → scout legs: lodging | eatery | activity (exploration mode = diffuse until MAIN)

**Phase B (shipped):** `runTripExperienceParallelScouts` — `Promise.all` on lodging · eatery · activity via `buildTripExperienceParallelScouts` → `mergeTripExperienceScoutOutcomes` → single reel batch (`hub.trip_experience_parallel`). Operator gate: `trip_experience_parallel` when slots complete. Pin-bar: `executeTripExperienceParallelScout` after ask_chips or direct submit.

**Phase C (shipped):** `commitOneShotTripExperienceMainClient` — rank-1 per scout leg (`lodging` · `eatery` · `activity`) via `pinTripExperienceMainLegsToContext` (atomic multi-leg metadata). Lodging leg gets room cards; **no auto express** until user taps.
```

## 5. Operator `ask_chips` (one screen)

Priority: `fun_axis` → `destination_scope` → `dates` → `budget` (max 4 chips).

Copy (L1): `tripExperienceAskHint` — 「방향만 골라 주세요 — 맞춰 볼게요」

After chip pick → `writeTripExperiencePartial` → re-run plan → scout when ready.

## 6. Globe vs Field

| Phase | Surface |
|-------|---------|
| Ambiguous fun trip | Globe compose + ask_chips |
| Leg MAIN picked | Field cards (숙소 · 맛집 · 놀거리) |
| Checkout | Field express (Identity + Payment vault) |

## 7. Grocery leg (later)

When user says **「현지에서 찜닭 만들고 싶어」** inside an open trip Context:

```
trip-experience Context
  → domain switch @ grocery-prep
  → dish=찜닭 → ingredients[]
  → Hub: mart / live commerce / delivery
```

See `docs/RIMVIO_GROCERY_COMMERCE_DOMAIN.md`.

## 8. Tests

```bash
npx tsx scripts/test-trip-experience-domain.ts
npx tsx scripts/test-trip-experience-parallel-scout.ts
npx tsx scripts/test-trip-experience-main-commit.ts
npx tsx scripts/test-grocery-prep-plan.ts
```

## 9. Phase plan

| Phase | Scope |
|-------|--------|
| **A (now)** | Pure plan + ask_chips gate + metadata partial write |
| **B (shipped)** | Parallel scout (lodging + eatery + activity) after readyForScout |
| **C (shipped)** | commit MAIN per leg + lodging room cards (no auto-pay) |
| **D** | grocery-prep child leg + live commerce Hub |
