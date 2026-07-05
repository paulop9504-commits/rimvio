# Execution Graph + Capability Graph

> **Canonical (Method 2):** `docs/RIMVIO_EXECUTION_GRAPH.md` — Execution nodes with Spatial Targets + Resources + Actions.  
> This doc describes Method 1 (Capability Graph first). Kept for migration reference only.

**Status:** superseded by Method 2 · ADR 007  
**Related:** `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md` · ADR `docs/adr/006-execution-capability-graph.md`  
**Code SSOT:** `lib/context-blueprint/execution-graph.ts` · `lib/context-blueprint/capability-graph.ts` · `lib/context-blueprint/spatial-target.ts`

---

## Why not space-first?

An OS manages **Resources**, not maps.

Travel is not “find a place on a globe first.” It is **combining Capabilities**:

```text
Intent: 일본 여행 갈래
  ↓
Capabilities (computed first)
  • 이동 · 숙박 · 식사 · 결제 · 일정 · 통신 · 보험
  ↓
Each capability resolves its own target
  숙박 → (region) → (property)
  ↓
Domain AI executes per capability node
```

The same stack handles **digital** contexts (online purchase, remote consult, video meeting) where **Spatial Target is null or `mode: digital`**. Travel fills Spatial richly; commerce may not.

**Space is an attribute of execution — not the center of Context OS.**

---

## Stack (long-term)

```text
Intent
  │
  ▼
Execution Graph          WHAT executions are needed?
  │
  ▼
Capability Graph         WHAT resources/abilities per execution?
  │
  ▼
Spatial Target           WHERE (optional per capability)
  │
  ▼
Domain AI (L3)           search · Ghost Pins · prepare · never Commit
```

This **does not replace** the five layers (L1–L5). Graphs live inside **L2 Blueprint** as sub-contracts. L1 composes; L3 reads and executes assigned nodes.

---

## Execution Graph

Ordered work units — OS “process list.”

| Node kind | Example |
|-----------|---------|
| `discover` | Frame trip capabilities |
| `prepare` | Confirm destination |
| `allocate` | Lodging candidates |
| `execute` | Run domain search |
| `approval_gate` | User confirms booking |
| `commit` | Hand to L5 |
| `observe` | Post-commit watch |

Each node binds **capability IDs** and an **assigned executor** (`lodging`, `transit`, …).

**Code:** `ExecutionGraph` · `ExecutionGraphNode` · `composeExecutionGraph()`

---

## Capability Graph

Required abilities for the context.

| Capability | Spatial | Example executor |
|------------|---------|------------------|
| `mobility` | physical | `transit` |
| `lodging` | physical | `lodging` |
| `eatery` | physical (near stay) | `eatery` |
| `payment` | digital | `finance` |
| `schedule` | any | `schedule` |
| `communication` | digital | `travel` |
| `insurance` | digital | `travel` |
| `digital_delivery` | digital | vertical-specific |

Nested resolution example (lodging capability):

```text
lodging
  → region (Japan — unresolved)
  → city (Osaka — hypothesis until user confirms)
  → property (hotel — L3 search after confirm)
```

**Hypothesis law applies** to capability `resolution` the same as Execution Space slots.

**Code:** `CapabilityGraph` · `CapabilityNode` · `composeCapabilityGraph()`

---

## Spatial Target (per capability)

Not a root graph — attached to each capability when relevant.

```typescript
SpatialTarget.mode: "physical" | "digital" | "remote" | "any"
SpatialTarget.resolution: confirmed | hypothesis | unresolved
```

- **Travel MVP:** `spatialPlan` (Execution Space) remains a valid **map projection shortcut**.
- **Long-term:** `spatialPlan` may be **derived** from capability spatial targets for Globe UI; SSOT for “where lodging runs” is the lodging capability node.

---

## Blueprint v4 sub-contracts

```text
ContextBlueprint
├── goal
├── personalContext          (WHO)
├── executionGraph           (WHAT runs — OS center)
├── capabilityGraph          (WHAT abilities)
├── spatialPlan              (WHERE — MVP / map projection)
├── temporalPlan             (WHEN)
├── resourcePlan             (WHAT resources · gaps)
├── assignedExecutors
├── executionScope
└── approvalPolicy
```

`resourcePlan` overlaps capability `resourceKinds` today; over time capabilities become SSOT for resource needs, `resourcePlan` holds gaps and `nextQuestion`.

---

## Travel MVP vs long-term

| Phase | L1 compose |
|-------|------------|
| **Travel MVP (now)** | `spatialPlan` + `resourcePlan` is sufficient; optional graphs for forward compat |
| **Context OS (target)** | `executionGraph` + `capabilityGraph` required; `spatialPlan` derived or co-composed for map |

Reference: `examples/japan-travel-capability-graph.ts` · `examples/japan-travel-execution-space-hypothesis.ts`

---

## Vertical reuse (same graph shape)

| Vertical | Execution nodes | Capabilities |
|----------|-----------------|--------------|
| Travel | frame → destination → lodging → commit | mobility · lodging · eatery · … |
| Trade | list → meet → pay → commit | inventory · payment · mobility |
| Medical | triage → appointment → Rx → commit | care · schedule · payment · insurance |
| Work | schedule → meet → deliver | schedule · communication · digital_delivery |
| Smart home | trigger → act → confirm | device · schedule · payment |

---

## Layer rules (unchanged)

| Layer | Graph role |
|-------|------------|
| **L1** | Compose Execution + Capability graphs from Intent · dispatch L3 by ready nodes |
| **L2** | Immutable wire only |
| **L3** | Execute nodes where `assignedExecutor` matches · respect unresolved capability/spatial |
| **L4** | React to committed truth · never recreate graphs |
| **L5** | Commit after `approval_gate` nodes |

**L3 must not run lodging allocate** while lodging capability `resolution === unresolved`.

---

## PR gate

1. Is this an **execution node** or **capability** concern?
2. Does spatial belong on the **capability**, not as global root?
3. Digital context — is `spatialTarget.mode === digital`?
4. Hypothesis law respected?
5. Five layers and Owner Rule preserved?
