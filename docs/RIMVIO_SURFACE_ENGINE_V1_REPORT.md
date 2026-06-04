# Rimvio Surface Engine V1 — Implementation Report

**Date:** 2026-06-04  
**Constitution:** [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md)  
**Audits:** [RIMVIO_SYSTEM_AUDIT.md](./RIMVIO_SYSTEM_AUDIT.md) · [RIMVIO_SURFACE_AUDIT.md](./RIMVIO_SURFACE_AUDIT.md)

---

## 1. Directory Tree

```text
lib/surface-engine/
├── index.ts                 # Public exports
├── surface-contract.ts      # Canonical Surface schema (v1)
├── surface-types.ts         # Type re-exports + contract version
├── surface-builder.ts       # buildSurfacesFromLife + Primary Action Engine
├── surface-priority.ts      # Urgency / recency / lifecycle scoring
├── surface-ranker.ts        # Deterministic ordering
├── surface-resolver.ts      # resolveSurfaces() orchestration
├── surface-router.ts        # FEED / CHAT / CALENDAR routing
├── surface-law.ts           # ≤5 prominent, secondary caps
└── surface-test-fixtures.ts # North-star utterance fixtures

lib/life-read-model/
└── read-surface-dependencies.ts  # Surface Engine read helper

scripts/
└── test-surface-engine.ts   # Contract, ranking, boundary, primary action tests
```

---

## 2. Runtime Flow

```text
User thought (Input Layer)
        ↓
EventCandidate → CommitTruth → EventStore
        ↓
readLifeProjections()          ← sole SSOT read for builder
readSurfaceDependencies()      ← optional narration enrichment
        ↓
buildSurfacesFromLife()
        ↓
rankSurfaces()                 ← deterministic, no AI
        ↓
enforceSurfaceLaw()            ← primary first, caps
        ↓
routeSurfacesToChannels()      ← FEED | CHAT | CALENDAR
        ↓
UI Components (render + dispatch only)
```

**Entry point:** `resolveSurfaces(input?)` → `SurfaceEngineResult`

---

## 3. Surface Ownership Map

| Layer | Owns | Must not |
|-------|------|----------|
| **Event SSOT** | Life-state | UI composition |
| **Life Read Facade** | `readLifeProjections`, `readSurface` | Surface ranking |
| **Surface Engine** | Situation surfaces, primary action, routing | `event-store`, `commit-truth`, capabilities |
| **Components** | Render + action dispatch | Build/rank surfaces |
| **Execution** | Provider dispatch from `intent` keys | SSOT writes |

Legacy modules (`surface-router/`, `visibility-bridge/`, `surface-render-contract/`) remain until P2 merge; **V1 canonical path is `lib/surface-engine/`.**

---

## 4. Surface Lifecycle

| Surface lifecycle | Driven by EventCandidate lifecycle |
|-------------------|-------------------------------------|
| `draft` | `mentioned` |
| `preparing` | `confirmed` |
| `in_progress` | `scheduled`, `active` |
| `completed` | `completed` |
| `archived` | `archived` (excluded from build) |

Primary action advances via `completedActionIds` in `SurfaceBuildContext` (behavior signal, not words).

---

## 5. Surface Ranking Model

**Formula (deterministic):**

```text
surfacePriorityScore =
  proximityUrgency(hoursUntilStart)
+ lifecycleWeight(scheduled > mentioned)
+ recency(updatedAt)
+ interaction(focused, recent, dismissed)
+ round(confidence × 8)
```

**Bands:** `critical` ≥85 · `high` ≥60 · `medium` ≥35 · `low` otherwise

**Sort:** score desc → startAt asc → id asc

No LLM, embeddings, or provider APIs.

---

## 6. Surface Contract Spec (v1)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `surface:ec:{eventId}` |
| `type` | SurfaceType | travel, schedule, food, goal, … |
| `title` | string | Situation title |
| `description` | string | One-line context |
| `primaryAction` | SurfaceAction | **Exactly one** |
| `secondaryActions` | SurfaceAction[] | Max 4 |
| `people` | SurfacePerson[] | v1 empty; extension point |
| `resources` | SurfaceResource[] | place, link, … |
| `events` | SurfaceEventRef[] | SSOT refs, not raw store |
| `narration` | SurfaceNarration \| null | Optional explanation |
| `priority` | SurfacePriority | band + `surfacePriorityScore` |
| `visibility` | prominent \| normal \| muted \| hidden |
| `lifecycle` | SurfaceLifecycle | Situation phase |

**Actions** use `intent` keys (`book_flight`, `navigate`, …) — never Kakao/Maps URLs.

---

## 7. Migration Plan

| Phase | Work |
|-------|------|
| **P1 (now)** | Surface Engine V1 + tests in MVP bundle |
| **P2** | Wire `components/action-chat-feed`, `threadline`, `calendar-board` to `resolveSurfaces()` |
| **P3** | Thin `use-action-chat` — dispatch only; remove duplicate composition |
| **P4** | Merge legacy `lib/surface-router`, `surface-render-contract` into `surface-engine` |
| **P5** | Capability Registry resolves `SurfaceAction.intent` → execution |

**Component rule:** replace direct `readSurface()` in UI with `resolveSurfaces().routes[channel]`.

---

## 8. Risk Report

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dual surface systems (legacy router vs V1) | Medium | Document canonical path; deprecate old exports |
| `resolveSurfaces` calls `readSurfaceDependencies` (heavier read) | Low | Use `buildSurfacesFromLife` only where narration not needed |
| Primary action travel chain needs `completedActionIds` from learning | Medium | Wire action-registry / behavior telemetry P2 |
| People/resources sparse in v1 | Low | Extension points on contract |
| PM mode doc missing (`RIMVIO_PM_MODE.md`) | Low | Constitution + this report substitute |

---

## 9. Production Readiness Score

| Criterion | Score (0–10) | Notes |
|-----------|--------------|-------|
| Contract stability | 9 | Versioned schema + tests |
| Truth boundary | 9 | Builder uses `readLifeProjections` only |
| Deterministic ranking | 10 | Fully rule-based |
| Primary action clarity | 8 | Travel chain tested; more domains in P2 |
| UI integration | 4 | Engine ready; components not wired |
| CI enforcement | 8 | `test:surface-engine` + MVP step |
| Capability decoupling | 9 | Intent keys only |

**Overall: 6.5 / 10 — ship-ready as library; not yet end-user visible until P2 UI wire-up.**

---

## Tests

```bash
npm run test:surface-engine
npm run test:mvp   # includes surface-engine step
```

**Covers:** contract keys, travel primary chain, deterministic ranking, builder inference, router caps, no event-store/capability imports in `lib/surface-engine/`.
