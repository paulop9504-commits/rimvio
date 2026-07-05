# Rimvio Context OS — Five-Layer Architecture

**Status:** locked · chief architect · PR gate  
**Canonical vocabulary:** `docs/RIMVIO_CANONICAL_VOCABULARY_V2.md`

---

Rimvio is **not** a travel app, marketplace, or chatbot.

Rimvio is a **Context Operating System**.

```text
Intent → Blueprint → Execution → Commit → Reality
```

**Never collapse layers. Never move responsibilities across layers.**

---

## Article 0 (Constitution)

> **Reality is never modified without an explicit Commit.**  
> **Intent never mutates Reality.**  
> **Blueprint never executes.**  
> **Execution never decides.**  
> **Humans own the final authority.**

---

## Layer Owner Rule

**Only the owner layer may mutate its own objects.**

| Layer | Owns | Object |
|-------|------|--------|
| **L1** | Intent | Intent classification · Container selection · Blueprint **creation** · Dispatch |
| **L2** | Context Contract | `ContextBlueprint` (immutable wire) |
| **L3** | Domain Execution | Execution artifacts · Ghost Pins · prepared actions · context memory |
| **L4** | Runtime Reaction | Tasks · reactive Ghost Pins · notifications · alternatives |
| **L5** | Reality Mutation | Bookings · payments · trade · reservations · calendar · messages |

Non-owners may **read** upstream objects. Non-owners **never mutate** objects they do not own.

---

## Forbidden Dependencies

Without these rules, L4 mutates Blueprint, L3 reinterprets Intent, and the stack collapses.

| Layer | May | Must never |
|-------|-----|------------|
| **L1** | Call L2 (`composeContextBlueprint`) · Dispatch L3 (interface/event, not impl import) | Import L3 implementations · Search domain resources · Generate Ghost Pins · Call booking APIs |
| **L2** | — | Import anything · Execute · Mutate after handoff |
| **L3** | Read L2 | Mutate L2 · Call Globe AI · Commit (L5) without approval gate |
| **L4** | Read L2 · Read committed truth | Create Blueprint · Dispatch Domain Executors · Mutate L2 · Commit without L5 |
| **L5** | Read prepared execution from L3 | Create execution · Decide Intent · Skip approval when `approvalPolicy` forbids |

**L2 is pure data only** — no imports from L3/L4/L5.

---

## State Transition Diagram

The OS is a **state machine**. AI must know **where** it is allowed to act.

```text
Intent
  │  L1
  ▼
BlueprintCreated
  │  L3 reads Blueprint
  ▼
Executing
  │  L3
  ▼
ExecutionPrepared        (Ghost Pins · prepared actions — not Commit)
  │  approvalPolicy
  ▼
WaitingApproval          (human gate)
  │  L5 · user approves
  ▼
Committed                (Reality mutation)
  │  L4 watches
  ▼
Observed
  │  L4
  ▼
Reacted                  (tasks · notify · alternatives — no new Blueprint)
  │
  └──► Executing (optional, same Blueprint scope only)
```

**Code SSOT:** `CONTEXT_RUN_STATES` · `CONTEXT_RUN_TRANSITIONS` in `lib/context-blueprint/context-run-state.ts`

| State | Owner |
|-------|-------|
| `intent` | L1 |
| `blueprint_created` | L2 handoff complete |
| `executing` | L3 |
| `execution_prepared` | L3 |
| `waiting_approval` | L5 gate (user) |
| `committed` | L5 |
| `observed` | L4 |
| `reacted` | L4 |

---

## Container AI — Operator (user-facing)

**Globe AI designs. Container AI operates. User sees one AI.**

Inside an active container, the floating frame (Trip Assistant) orchestrates:

```text
Travel Brain · Execution Graph Reader · Context Condition AI (internal)
· Domain AI Router · Ghost Pin Generator · Action Composer
```

**Full spec:** `docs/RIMVIO_BRIDGE_VS_CONTAINER.md` · ADR 009 · ADR 008 · `lib/container-ai/`

| Role | Layer | Metaphor |
|------|-------|----------|
| Globe AI | L1 | Architect |
| Container AI | Operator surface | Operate container |
| Domain AI | L3 | Execute |
| Context Condition AI | L4 (internal) | React |
| Commit | L5 | Reality |

---

## Layer 1 — Global Orchestrator (Globe AI)

**Owner:** Intent

| Responsibilities | Outputs |
|------------------|---------|
| Detect Intent | `ContextBlueprint` |
| Choose Context Container | |
| Create Blueprint (L2 compose) | |
| Dispatch to Domain AI | |

**Never:** domain search · itineraries · booking APIs · Ghost Pins · domain workflows.

**Code map:** `lib/context-run/` · Composer ingress — **stop at Blueprint + dispatch**.

---

---

## Execution Space (Spatial Execution Graph)

**Canonical name:** `ExecutionSpace` · wire `graphKind: "spatial_execution_graph"`

> **Canonical OS kernel:** Execution Graph Method 2 — `docs/RIMVIO_EXECUTION_GRAPH.md`.  
> Execution is the protagonist; Spatial/Temporal attach **per node** via `spatialTargets` / `temporalTargets`.

Rimvio does **not** start with *"search Osaka"*. Globe AI **creates the execution stage first**.

```text
Intent
  ↓
Execution Space 생성        ← L1 (stage design — NOT hotel search)
  ↓
Resource Allocation         ← L2 ResourcePlan gaps
  ↓
Domain Execution            ← L3
  ↓
Commit                      ← L5
```

Same principle as OS: **allocate execution environment → allocate resources → run process**.

### Hypothesis law (critical)

Globe AI **must not confirm** geography the user has not stated.

| User said | Globe AI may |
|-----------|----------------|
| "일본 여행" | Skeleton graph + `destination` slot **unresolved** · candidates Osaka/Tokyo/Fukuoka |
| "오사카" | **New Blueprint** with `destination` **confirmed** · materialize anchors |

```text
resolution: confirmed | hypothesis | unresolved
```

- **confirmed** — user_stated or truth-backed only (`assertExecutionSpaceSlotConfirmation`)
- **hypothesis** — AI-prepared frame, not user decision
- **unresolved** — requires `nextQuestion` or user pick from candidates

L3 **must not** run lodging search against unresolved destination slots.

**Code:** `execution-space-slots.ts` · `examples/japan-travel-execution-space-hypothesis.ts` · `confirm-execution-space-slot.ts`

### Vertical frames (same graph shape)

| Vertical | Execution Space skeleton |
|----------|---------------------------|
| Travel | Home → Airport → Stay → Activity → … → Home |
| Trade | Seller home → Meetup → Buyer home |
| Medical | Home → Clinic → Pharmacy → Home |
| Work | Office → Client → Meeting room |

---

## Blueprint sub-contracts (L2 — single SSOT)

L2 remains **one** immutable `ContextBlueprint`. Graphs + WHERE / WHEN / WHAT are **sub-contracts**, not separate layers.

```text
WHO   Personal Context     → input to L1 compose
WHAT  ExecutionGraph       → ordered execution nodes (OS center — long-term)
WHAT  CapabilityGraph      → required abilities · spatial per capability
WHAT  ResourcePlan         → requiredResources · knownTruth · emptySlots · nextQuestion
WHERE ExecutionSpace       → travel MVP / map projection (Spatial Execution Graph)
WHEN  TemporalPlan         → period · phases · timezone
```

```text
ContextBlueprint (v5 — Method 2)
├── goal                 Intent
├── executionGraph       phase nodes · resources · actions per node
├── spatialTargets       WHERE byNodeId
├── temporalTargets      WHEN byNodeId
├── resourcePlan         Resources · gaps · nextQuestion
├── assignedExecutors    Executors · executionScope · approvalPolicy
└── (MVP legacy)         spatialPlan · capabilityGraph · temporalPlan
```

**Full spec:** `docs/RIMVIO_EXECUTION_GRAPH.md`

### SpatialPlan — expected execution **space** graph (not itinerary)

Globe AI on *"10월에 일본 오사카 여행 갈래"* **does not search hotels first**.

```text
Intent → Travel Container → SpatialPlan (planning) → ResourcePlan gaps → Dispatch L3
```

Example path (space, not schedule):

```text
Home → Incheon Airport → Kansai Airport → Osaka Hotel Area → Dotonbori → USJ → Hotel → Airport → Home
```

**L4 uses SpatialPlan as location trigger:** near Incheon → mobile check-in CTA · near hotel → check-in · near Dotonbori → directions to reserved eatery.

**Code:** `lib/context-blueprint/spatial-plan.ts` · `resolve-spatial-plan.ts` · `examples/osaka-travel-spatial-plan.ts`

### Vertical reuse (same sub-contract shape)

| Vertical | SpatialPlan anchors |
|----------|---------------------|
| Travel | Home → Airport → Hotel → POI → … |
| Trade | Seller → meetup → Buyer |
| Medical | Home → Clinic → Pharmacy |
| Work | Office → Meeting room → Client site |

---

## Layer 2 — Context Blueprint

**Owner:** Context Contract

Immutable SSOT before execution. **Pure data. No imports. No execution.**

| Field | Role |
|-------|------|
| `id` | Blueprint identity |
| `version` | Revision number (supersede = new Blueprint from L1) |
| `ownerContext` | Container event / context id |
| `goal` | User objective |
| `priority` | low · normal · high · urgent |
| `containerKind` | travel · trade · medical · … |
| `constraints` | destination · period · participants · budget … |
| `requiredResources` | flight · lodging · transit · … |
| `knownTruth` | Truth-backed filled slots |
| `emptySlots` | Missing slots |
| `assignedExecutors` | Domain AIs allowed to run |
| `executionScope` | radius · allowed executors/resources |
| `approvalPolicy` | manual · auto_allowed · multi_step · requires_identity |
| `nextQuestion` | One minimal question, if any |
| `createdBy` | globe_ai · user · system |
| `createdAt` | ISO timestamp |

**`approvalPolicy`** — critical for medical · finance · payment verticals.

**Code map:** `lib/context-blueprint/types.ts` · composed **only** by L1.

---

## Layer 3 — Domain Executor

**Owner:** Domain Execution

Read Blueprint · search · Ghost Pins · APIs · context memory.

**Never:** reinterpret Intent · recreate Container · mutate Blueprint · Commit without L5 gate.

**Code map:** `lib/globe/lodging-agent/` · lodging/eatery discovery · Hub pipelines.

---

## Layer 4 — Context Condition AI

**Owner:** Runtime Reaction

Observe committed truth · react to signals. **Never** create Blueprint · **never** dispatch executors.

**Code map:** `lib/globe/context-condition-ai/`

> Proactive user requests (“숙소 찾아줘”) on an existing context = **L3** when Blueprint assigns executor. L4 is **signal-driven** only.

---

## Layer 5 — Commit Layer

**Owner:** Reality Mutation

**Never** creates execution — only **commits prepared execution** after approval.

**Code map:** `lib/source-of-truth/commit-truth.ts` · Field FSM confirm.

---

## Philosophy

```text
User expresses Intent
    → System builds Context (L1 + L2)
    → Domain AI prepares execution (L3)
    → User approves (L5)
    → Reality changes (L5)
    → System observes & reacts (L4)
```

### Mantras

**AI recommends. Humans decide.**

**AI prepares. Humans approve. Reality commits.**

(L3 → L5 → Reality in one line.)

### First Principle

Reduce **decision cost** — not replace **judgment**.

Collective Intelligence = best starting point. **Personal Context always wins.**

---

## Feature Checklist (PR gate)

1. Which **layer owns** this? (Owner Rule)
2. Does it **mutate** an object another layer owns? (Forbidden)
3. Which **state** does this transition? (State machine)
4. Should Globe AI know this?
5. Blueprint field?
6. Domain AI executes?
7. Context Condition reacts later?
8. Requires Commit + `approvalPolicy`?

**Cross-layer responsibility = reject.**

Preserve the architecture at all costs.
