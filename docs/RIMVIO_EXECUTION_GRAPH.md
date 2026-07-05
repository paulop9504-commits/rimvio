# Execution Graph — Method 2 (Canonical)

**Status:** locked · chief architect · Context OS kernel  
**Related:** `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md` · ADR `docs/adr/007-execution-graph-method2.md`  
**Code SSOT:** `lib/context-blueprint/execution-graph.ts` · `spatial-targets.ts` · `temporal-targets.ts` · `execution-node-action.ts`

---

## First principle

**Execution is the protagonist. Space is an attribute of execution.**

Not: map → search → book  
But: **Intent → Execution Graph → (Spatial · Temporal · Resources · Actions) per node → Domain AI**

Same graph shape for travel · trade · medical · work · smart home.

---

## Node stack (per execution step)

```text
Execution Node
  ↓
Spatial Target     (optional — digital nodes use mode: digital)
  ↓
Resources          (resourceKinds on node)
  ↓
Actions            (concrete steps — 여권 확인 · 체크인 · 채팅 · 결제)
  ↓
Domain AI (L3)
```

---

## Blueprint v5 (L2 SSOT)

```text
ContextBlueprint
├── Intent              goal
├── ExecutionGraph      ordered phase nodes
├── SpatialTargets      byNodeId — WHERE each node runs
├── TemporalTargets     byNodeId — WHEN each node applies
├── Resources           resourcePlan — gaps · truth · nextQuestion
├── Executors           assignedExecutors · executionScope · approvalPolicy
└── (deprecated MVP)    spatialPlan · capabilityGraph · temporalPlan
```

**L1 composes. L3 executes ready nodes. L5 commits after approval_gate nodes.**

---

## Travel example

```text
Trip
  ↓
Prepare      → 집        → 여권 확인 · 짐 싸기 · 환전
Departure    → 인천공항  → 체크인 · 수하물 · 탑승
Arrival      → 간사이    → (transit)
Stay         → 오사카    → 호텔 · 체크인        [destination unresolved]
Explore      → 시내      → 식사 · 관광
Return       → 인천      → 공항 이동 · 탑승
```

**Code:** `examples/travel-trip-execution-graph.ts` · `composeTravelTripBlueprint()`

---

## Trade example

```text
Listing      → 집     → 물품 등록
Negotiation  → online → 채팅
Meeting      → 카페   → 직거래
Payment      → online → 결제
Complete
```

---

## Medical example

```text
Prepare    → 집   → 문진표
Visit      → 병원 → 내원
Treatment  → 약국 → 처방 수령
```

---

## Hypothesis law (unchanged)

Node `resolution`: **confirmed | hypothesis | unresolved**

- User said "일본 여행" only → `stay` spatial **unresolved** (Osaka/Tokyo candidates via nextQuestion)
- L3 **must not** run `stay` lodging allocate while unresolved

---

## vs Method 1 (Capability Graph)

Method 1 computed capabilities first (mobility · lodging · payment).  
**Method 2 (canonical)** folds resources into **execution nodes** — simpler dispatch, one graph for all verticals.

`capabilityGraph` remains optional/deprecated wire for migration.

---

## vs Execution Space (travel MVP)

`spatialPlan` (Execution Space) = **map projection shortcut** for Globe UI during MVP.  
Long-term: derive map anchors from `spatialTargets.byNodeId` for physical nodes.

---

## Layer rules

| Layer | Role |
|-------|------|
| L1 | Compose ExecutionGraph + SpatialTargets + TemporalTargets from Intent |
| L2 | Immutable wire |
| L3 | Execute node where `assignedExecutor` matches · run `actions` |
| L4 | React to committed truth — never recreate graph |
| L5 | Commit after user approves prepared actions |

---

## PR gate

1. Is this an **execution node** concern?
2. Spatial attached via **spatialTargets.byNodeId**, not global root?
3. Actions listed on node, not free-floating chat?
4. Hypothesis law on node + spatial resolution?
5. Five layers preserved?
