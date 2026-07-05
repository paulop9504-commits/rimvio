# Rimvio Canonical Vocabulary v2

**Status:** locked · supersedes v1 · PR gate  
**Date:** 2026-07-06  
**Goal:** **1 object = 1 responsibility**  
**Wire SSOT:** `lib/context-os/vocabulary-v2.ts` · `lib/runtime/` · `lib/context-blueprint/flow.ts` · `lib/operator/`

> v1: `docs/RIMVIO_CANONICAL_VOCABULARY_V1.md` (superseded)

---

## OS validation (reject if violated)

| Rimvio | OS | Question |
|--------|-----|----------|
| **Context** | File **content** (meaning unit) | What is this moment about? |
| **Bridge** | File **identity** (links Contexts) | How do memories connect? |
| **Runtime** | **Process** | What is running now? |
| **Blueprint** | Process **spec** | How should it run? |
| **Flow** | Scheduler **state** | What happens next? |
| **Commit** | **System call** | Change reality? |

---

## Layer diagram

```text
Capture (raw, no meaning)
    ↓ ingest / AI interpret
Context (SSOT meaning · Globe node)          ← EventCandidate row
    ↓ Globe AI composes
Bridge (memory graph · Context links)        ← bridgeId
    ↓ spawn
Runtime (Process · mutable session)            ← runtimeId
    ↓ attach
Blueprint (immutable spec)                     ← Flow + resources + policy
    ↓ Operator routes
Domain modules → Ghost prep
    ↓ human gate
Commit (external + Context truth write)
```

**User UI = Reality Surface** — projection of Context · Bridge · Runtime state · Flow (+ Capture affordances).  
**Hidden OS:** Blueprint · Operator internals · Commit · storage.

See `docs/RIMVIO_REALITY_SURFACE.md`.

**Internal modules (not globe root):** Operator chrome · Domain AI · Context Condition AI

---

## Reality Surface (Globe UX)

```text
Reality Surface =
  Capture previews
+ Context nodes (Globe dots)
+ Bridge paths (links · order)
+ Runtime state projection (active phase)
+ Flow projection (progress · next hint)
```

**Excluded from globe UX:** Blueprint · Operator internals · Commit logic · DB schema.

---

## Definitions (exactly one sentence each)

### Reality Surface
The **globe compositor layer** that projects Capture, Context, Bridge, Runtime state, and Flow — never Blueprint, Operator internals, or Commit.

| | |
|---|---|
| **Role** | UX / compositor |
| **Layer** | Surface (above data, below OS execution) |
| **Lifecycle** | re-rendered on recall · GPS · Runtime phase change |
| **Relations** | **reads** Context/Bridge/Runtime/Flow; **never writes** Commit |
| **Code** | `lib/reality-surface/` · `rimvio-globe-hub` · situation-projection manifests |
| **Question** | What does the user see on Earth **right now**? |

---

### Capture
Raw input layer (photo, GPS, video, text) with **no meaning** until ingested into Context.

| | |
|---|---|
| **Role** | Input |
| **Layer** | Ingest |
| **Lifecycle** | ephemeral → attached to Context |
| **Relations** | Feeds **Context** creation/update |

---

### Context
The **SSOT meaning unit** — a Globe UI node representing interpreted reality (who/where/when/what).

| | |
|---|---|
| **Role** | Memory content / meaning |
| **Layer** | FACT → committed truth row |
| **Lifecycle** | created → enriched → archived |
| **Relations** | Many Contexts link via **Bridge**; **never** holds **Flow** or **Blueprint** |
| **Code** | `ContextRecord` = `EventCandidate` · `contextId` |
| **Question** | What happened (meaning)? |

---

### Bridge
Memory **identity and graph** linking Contexts (order, relationship, flow of memory) — **not** execution.

| | |
|---|---|
| **Role** | File identity / relationship graph |
| **Layer** | RECALL / ontology projection |
| **Lifecycle** | long-lived; grows as Contexts link |
| **Relations** | 1 Bridge → N Contexts; N Runtimes may reference same Bridge |
| **Code** | `bridgeId` · entity graph edges (future SSOT) |
| **Question** | How do these memories connect? |

---

### Runtime
The **active Process session** — mutable state where user interaction and AI operations occur.

| | |
|---|---|
| **Role** | Process instance |
| **Layer** | Execution session |
| **Lifecycle** | `active` → `completed` \| `suspended` |
| **Relations** | bound to `contextId` + `bridgeId`; holds **Blueprint** |
| **Code** | `RimvioRuntime` · `runtimeId` · `lib/runtime/` |
| **Question** | What is happening now? |

**Forbidden word:** **Container** (OS sense) — use **Runtime** only.

---

### Blueprint
Immutable **execution design** for one Runtime — defines Flow, resources, executors, approval policy.

| | |
|---|---|
| **Role** | Process specification |
| **Layer** | L2 contract |
| **Lifecycle** | composed → superseded (new revision) |
| **Relations** | belongs to **Runtime**; references **contextId** + **bridgeId** |
| **Code** | `ContextBlueprint` v7 |
| **Question** | How should it happen? |

---

### Flow
Runtime **progress sequence** (Prepare → Stay → …) — scheduler state; **user-facing name** for execution plan.

| | |
|---|---|
| **Role** | Task graph / scheduler state |
| **Layer** | L2 on Blueprint only |
| **Lifecycle** | node statuses mutate during Runtime |
| **Relations** | **never** on Context or Bridge |
| **Code** | `Flow` alias · wire `ExecutionGraph` until rename |
| **Question** | What happens next? |

**Forbidden:** user-facing **Execution Graph** — say **Flow**.

---

### Operator
The **single user-facing AI** operating an active Runtime (routes Travel Brain, Condition, Domain).

| | |
|---|---|
| **Role** | Process operator UI |
| **Layer** | Product surface |
| **Lifecycle** | while Runtime `active` |
| **Relations** | reads **Blueprint/Flow**; invokes internal modules |
| **Code** | `lib/operator/` · `OperatorContext` |
| **Question** | What do I do in this step? |

**Forbidden user label:** Container AI — use **Operator** (L1: Trip Assistant).

---

### Globe AI
L1 **architect** — Intent → **Context** create → **Bridge** compose → **Runtime** spawn → **Blueprint** handoff.

| | |
|---|---|
| **Role** | Architect |
| **Layer** | L1 |
| **Lifecycle** | per Intent ingress |
| **Relations** | does **not** operate Runtime (that's **Operator**) |
| **Question** | What should exist? |

---

### Domain AI
L3 **specialist executor** — lodging, transit, trade — prepares artifacts; never sole Commit.

| | |
|---|---|
| **Role** | Domain execute |
| **Layer** | L3 |
| **Question** | How does this domain prepare? |

---

### Context Condition AI
L4 **internal reactive module** (distance, price band, anchor) — invoked by **Operator** only.

| | |
|---|---|
| **Role** | React |
| **Layer** | L4 internal |
| **Forbidden** | user-facing name |

---

### Commit
L5 **gated reality mutation** — bookings, payments, calendar, Context truth writes.

| | |
|---|---|
| **Role** | System call |
| **Layer** | L5 |
| **Code** | `commit-truth.ts` |
| **Question** | Make it real? |

---

## ID model (API)

| Id | Object | Example |
|----|--------|---------|
| `contextId` | Context SSOT | `evt-osaka-trip` |
| `bridgeId` | Bridge graph | `bridge-evt-osaka-trip` |
| `runtimeId` | Runtime session | `trip-runtime-001` |

Same Context, new trip year → **same `contextId`/`bridgeId`**, **new `runtimeId`**.

---

## Banned multi-meanings (v2)

| Banned | Use instead |
|--------|-------------|
| Context = UI + Runtime + Memory mixed | **Context** = SSOT only; UI = "node" |
| **Container** (OS) | **Runtime** |
| **Execution Graph** (user-facing) | **Flow** |
| **Container AI** (user-facing) | **Operator** |
| Flow/Blueprint on Context metadata | reject at `assertContextHasNoFlow` |

---

## Legacy mapping table

See `docs/RIMVIO_VOCABULARY_V2_MIGRATION_REPORT.md` for full scan.

| Legacy | v2 canonical | Action |
|--------|--------------|--------|
| `EventCandidate` | **Context** (`ContextRecord`) | keep type name; use `contextId` in new API |
| `contextEventId` | `contextId` | rename on touch |
| `ContainerRuntime` | **Runtime** (`RimvioRuntime`) | alias deprecated |
| `ContainerRecord` | **GoalBucket** (legacy) | not Runtime |
| `ContainerRoute` | **DockRoute** (legacy) | not Runtime |
| `LodgingAgentContainer` | **LodgingAgentScope** | not Runtime |
| `ExecutionGraph` (UX/docs) | **Flow** | alias in `flow.ts` |
| `Container AI` | **Operator** | alias in `operator/` |
| `bridgeId` = EventCandidate (v1) | `contextId` + separate `bridgeId` | Blueprint v7 |
| `ownerContext` | `runtimeId` | deprecated |
| `containerKind` | `runtimeKind` | rename on touch |
| Experience Bridge | **Experience Bridge** (qualified) | social protocol, not Bridge id |
| Context Run | ingress router | migrating → Globe AI path |

---

## Code entrypoints (v2)

| Module | Purpose |
|--------|---------|
| `lib/context-os/vocabulary-v2.ts` | IDs · guards |
| `lib/runtime/` | Runtime compose |
| `lib/context-blueprint/flow.ts` | Flow aliases |
| `lib/operator/` | Operator aliases |
| `lib/context-blueprint/types.ts` | Blueprint v7 |

---

## PR gate

1. One object, one question from OS table?
2. New code uses `contextId` / `bridgeId` / `runtimeId`?
3. No **Container** in new OS paths?
4. No **Execution Graph** in user copy?
5. Context metadata passes `assertContextHasNoFlow`?

---

## Document map

| Topic | Doc |
|-------|-----|
| **Reality Surface (Globe UX)** | `RIMVIO_REALITY_SURFACE.md` |
| Migration scan | `RIMVIO_VOCABULARY_V2_MIGRATION_REPORT.md` |
| Five layers | `RIMVIO_CONTEXT_OS_ARCHITECTURE.md` |
| v1 (archive) | `RIMVIO_CANONICAL_VOCABULARY_V1.md` |
