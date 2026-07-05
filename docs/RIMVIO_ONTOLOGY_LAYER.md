# Rimvio Ontology Layer (Personal Action Ontology)

> **Status:** locked 2026-07  
> **Rule:** EventCandidate remains SSOT — ontology objects are **read-only projections**.  
> **Companion:** `docs/RIMVIO_SEMANTIC_LAYER.md` (SPO triples), `docs/ACTION_OS_SPINE.md`, `docs/adr/003-personal-ontology-graph.md`

---

## Thesis — Action ontology, not analysis ontology

**Palantir / Foundry ontology** is a **static structure for analysis**:

```text
Objects · Properties · Links (schema-first)
        ↓
Analyst query · dashboard · investigation
        ↓
Human decides and acts outside the graph
```

The graph answers: *“How do we understand the world?”* — read-heavy, explorer-centric, human-in-the-loop for execution.

**Rimvio ontology** is a **dynamic structure for acting as the user’s agent**:

```text
FACT (EventCandidate SSOT)
  ↓ commit-truth → EntityEdge (evidence-backed)
  ↓ RECALL trigger (context match)
  ↓ SITUATION PROJECTION (solid + ghost layout)
  ↓ ACTION (@ registry · Hub · Field FSM · Context Condition AI)
  ↓ Execution → Progress → FACT again
```

The graph answers: *“When context matches, what should re-execute on my behalf?”* — not browse, not dashboard, not passive memory.

**KO one-liner:** 팔란티어 온톨로지는 **분석**을 위한 정적 구조; Rimvio 온톨로지는 **사용자 대리인으로 행동(Action)** 하는 동적 구조.

| | Analysis ontology (Palantir-class) | Action ontology (Rimvio) |
|--|----------------------------------|---------------------------|
| **Purpose** | Understand · investigate | **Match context → re-execute** |
| **Graph role** | Query target | **Trigger surface** for `@` / Hub / Field |
| **Writes** | Curated schema + ETL | **commit-truth only** — edges materialize from lived events |
| **UI** | Ontology Manager · Workshop | Three Floors: Replay → Context → **Action** |
| **AI role** | Insight · link suggestion | **Condition match → delegate execution** (registry-gated) |
| **Ghost / missing** | Null in warehouse | **Projection axis** — layout until Commit promotes solid |

**Mind-map / ontology peek on Globe** = **layout** (what is solid vs still missing) — not a graph explorer. **PR reject:** Graph explorer UI, LLM-invented edges at commit, analysis dashboards as hero surface.

**Code SSOT:** `lib/ontology/` (entity graph) · `lib/situation-projection/` (solid + ghost manifest) · `lib/globe/context-condition-ai/` (locked anchor + condition → immediate pins) · `lib/event-kernel/action-contracts/` (`@` registry).

---

## Three pillars (2026-06)

### 1. Notification objects

Single inbox queue — no map banners / stack duplicate cards.

```text
bridge invite · bridge activity · location confirm
  → projectPendingNotifications()
  → GlobeInboxSheet · Stack inbox hint
```

Dismiss SSOT: `lib/ontology/notifications/notification-store.ts` (mirrors legacy keys).

### 2. Experience subgraph

```text
EventCandidate
  → projectExperienceSubgraph()
      experience (node)
      captures[] (nodes)
      bridge | null (node)
```

Use for Bridge media trust, companion status, and future cross-object queries — **never** a second event store.

### 3. Action types (@ + hub)

```text
mention.{featureId}  — @ registry
hub.{connect_*|enable_*} — context hub services
  → rankWeight → scoreHubServiceRowBase → MAIN / hub rail
```

LLM reads PRM; execution stays on contract gate + hub handlers.

---

## Forbidden

- Persisted notification / capture / bridge tables parallel to EventCandidate
- Graph explorer UI
- LLM-invented action types outside registry

---

## Modules

| Path | Role |
|------|------|
| `lib/ontology/notifications/*` | Notification projection + dismiss store |
| `lib/ontology/nodes/*` | Experience · Capture · Bridge nodes |
| `lib/ontology/actions/*` | Unified action type registry |
| `hooks/use-globe-inbox.ts` | Inbox hook → notifications |
| `scripts/test-ontology-layer.ts` | Regression |
