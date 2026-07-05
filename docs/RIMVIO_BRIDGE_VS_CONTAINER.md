# Bridge vs Container — Memory vs Runtime

**Status:** locked · chief architect · PR gate  
**Related:** `docs/RIMVIO_CONTAINER_AI.md` · `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md` · ADR `docs/adr/009-bridge-container-runtime-split.md`  
**Code SSOT:** `lib/events/event-candidate.ts` (Bridge) · `lib/container-runtime/types.ts` (Container)

---

## OS analogy (locked)

| Rimvio | OS | 질문 |
|--------|-----|------|
| **Bridge** | **File** | 무엇이 **있었는**가? |
| **Container** | **Process** | 지금 **무엇을 실행 중**인가? |
| **Blueprint** | Process specification | **어떻게** 실행해야 하는가? |
| **Execution Graph** | Scheduler / task graph | **다음에** 무엇을 해야 하는가? |
| **Commit** | System call | 현실을 **어떻게 변경**할 것인가? |

```text
Bridge      → "What happened?"
Container   → "What is happening?"
Blueprint   → "How should it happen?"
ExecutionGraph → "What happens next?"
Commit      → "Make it real."
```

**One question = one layer.** PR reject if a single object answers two questions.

---

## Bridge — Memory Object (immutable · Truth)

**Bridge = Identity + Truth.** Almost never changes after commit.

| Owns | Does not own |
|------|----------------|
| Identity | ExecutionGraph |
| Truth (committed) | Phase / workflow state |
| Experience bundle | Pending actions |
| Memory · captures | Blueprint |
| Relationships · participants | Runtime session |

**Expresses:** *무엇이 있었는가*

Example — **10월 오사카 여행** (Bridge):

- 참가자 · 사진 · 메모 · GPS · 영상
- title · place · datetime · metadata
- stable **bridge id** — e.g. `evt-osaka-trip`

**Engineering SSOT:** `EventCandidate` (`lib/events/event-candidate.ts`)

**Hard law:** Bridge **never** stores `ExecutionGraph`, Blueprint, or workflow phase. Those are **runtime**, not memory.

---

## Container — Runtime Object (mutable · State)

**Container = Session + State + Execution.** Changes continuously.

| Owns | Does not own |
|------|----------------|
| State · phase | Committed truth (reads Bridge) |
| Execution · workflow | Identity replacement |
| Resources in flight | Long-term memory |
| Pending actions | |
| **runtimeId** (session) | |

**Expresses:** *지금 무엇을 실행 중인가*

Example — same trip, **runtime session**:

```text
Prepare → Departure → Stay → Explore → Completed
```

- **runtime id** — e.g. `trip-runtime-001`
- links to Bridge via **bridgeId** — `evt-osaka-trip`
- holds **Blueprint** + **ExecutionGraph** (via Blueprint)

**Engineering SSOT:** `ContainerRuntime` · `ContextBlueprint` (attached to runtime, not bridge)

---

## Identity vs Session

| | Bridge | Container |
|---|--------|-----------|
| **Id** | `bridgeId` (identity) | `runtimeId` (session) |
| **Stability** | Long-lived | Created · runs · completes |
| **Cardinality** | One identity | **Many runtimes per bridge** allowed |

### Same Bridge, new Container

```text
2026 — Bridge: evt-osaka-trip  →  Container: trip-runtime-001  (completed)
2028 — Bridge: evt-osaka-trip  →  Container: trip-runtime-002  (new session, reuse memory)
```

**Do not fix Bridge : Container = 1:1.** Most trips start 1:1; replan / re-run uses **same bridgeId, new runtimeId**.

---

## What lives where

```text
Bridge (File)
├── id / bridgeId
├── title · place · datetime
├── captures · GPS · media refs
├── participants · relationships
└── committed metadata only

Container (Process) — NOT on Bridge
├── runtimeId
├── bridgeId (ref)
├── status: active | completed | suspended
├── ContextBlueprint
│   ├── executionGraph      ← ONLY here
│   ├── spatialTargets
│   ├── temporalTargets
│   └── resourcePlan
└── Container AI (operator surface)
```

---

## Layer flow

```text
User Intent
  ↓ L1 Globe AI
Select/create Bridge (identity) + spawn Container (runtime) + compose Blueprint
  ↓ L2
Blueprint (immutable per revision) — executionGraph lives HERE, on Container side
  ↓ L3
Domain execute
  ↓ L5
Commit → updates Bridge truth
  ↓ L4
Container AI observes · reacts (reads Bridge + Blueprint + signals)
```

---

## Forbidden (PR reject)

| Violation | Why |
|-----------|-----|
| `executionGraph` on `EventCandidate` / Bridge metadata | Execution is not memory |
| Blueprint without `runtimeId` | Blueprint is process spec, not file |
| Container without `bridgeId` | Process must attach to identity |
| Collapse Bridge + Container into one id without session | Blocks 2028 re-run |
| Mutate Bridge identity when phase changes | Phase is Container state |

---

## Code map

| Concept | Path |
|---------|------|
| Bridge wire | `EventCandidate` |
| Container runtime wire | `lib/container-runtime/types.ts` |
| Blueprint (process spec) | `lib/context-blueprint/types.ts` — `bridgeId` + `runtimeId` |
| Container AI | `lib/container-ai/` |
| Experience Bridge (social) | `docs/RFC_EXPERIENCE_BRIDGE.md` — sharing protocol **on** Bridge, not Container |

**Legacy:** `ContextBlueprint.ownerContext` → prefer **`runtimeId`**; **`bridgeId`** = stable EventCandidate id.

Tests: `npx tsx scripts/test-bridge-container.ts`
