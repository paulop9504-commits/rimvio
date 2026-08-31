# ADR-067: Workspace Engine — Three Layers · WDK · View Contracts · Domain Ontology

**Status:** Accepted  
**Date:** 2026-08-30  
**Parent:** ADR-022 Context Workspace · ADR-026 Workspace SDK · ADR-034 Reality Primitives · ADR-054 Platform SDK · ADR-063 Capability Spec · ADR-066 Platform Economy

## Context

Rimvio must scale to thousands of producers without Main Agent or Reviewer chaos. Producers must not ship arbitrary React apps (app store model). They extend Rimvio through **contract-bound artifacts**:

- **Capability** — what can be done
- **Data** — what information is supplied
- **Ontology** — how the world is structured
- **View** — how objects are shown and manipulated

Maps, timelines, graphs, and ontology trees are **View-layer surfaces**, not Capabilities.

## Decision

### 1. Workspace three layers

```text
WORKSPACE
   │
   ├── DATA LAYER    — patches, collections, raw facts
   ├── OBJECT LAYER  — typed domain instances (Hotel, Property, Order)
   └── VIEW LAYER    — Map, Timeline, Table, Graph, Ontology tree (projection only)
```

**SSOT:** `lib/workspace-engine/layers.ts`  
**Wire:** Data → `ContextWorkspaceState` / manifest `data` · Object → `ContextWorkspaceNode` / ontology schema · View → View Contracts + projection

Views **never** mutate SSOT directly; they emit events/actions that route through Workspace Patch or Capability execution.

### 2. View Contract (Map first)

Map View is the first canonical contract:

- **Input:** `GeoObject[]` (id, latitude, longitude, title, metadata)
- **Events:** select, hover, open, filter, move
- **Actions:** focusObject, selectObject, openObject
- **Permissions:** read:location

Producers submit **Map Extensions**, not `map.create` Capabilities.

**SSOT:** `lib/workspace-engine/view-contracts/map-view-contract.ts`  
**Bridge:** `WorkspaceMapPin` ↔ `GeoObject` adapters reuse existing map SSOT.

### 3. Domain Ontology Schema registration

Ontology is **meaning structure**, not UI. Producers register:

- Object types + fields
- Relations (LOCATED_IN, HAS_PRICE, …)
- Domain namespace (travel, property, …)

Human-verified seed schemas: Travel v1, Property v1.  
Runtime AI must not invent ontology at commit time (ADR-003 action ontology law).

**SSOT:** `lib/workspace-engine/ontology/domain-ontology-schema.ts`  
**Registry:** `lib/workspace-engine/ontology/registry.ts` (MVP in-memory)

### 4. Workspace Developer Kit (WDK)

Developers compose **Rimvio Primitives** — not free-form apps:

Object · Collection · Relation · Map · Timeline · Table · Graph · Panel · Card · Form · Filter · Search · Action · Event

**SSOT:** `lib/workspace-engine/primitives.ts` (extends ADR-034 reality primitives)

### 5. Four producer kinds

| Kind | Question | Hub surface |
|------|----------|-------------|
| Capability | 무엇을 할 수 있는가? | capabilities pane |
| Data | 무슨 정보를 제공하는가? | data pane |
| Ontology | 세상을 어떻게 구조화하는가? | standards / ontology guide |
| View | 어떻게 보여주고 조작하는가? | standards / view guide |

**SSOT:** `lib/workspace-engine/producer-kind.ts`  
**Standards UI:** Hub Standards → WDK · View Producer · Ontology Producer

### 6. Extension validation pipeline

```text
Schema validation → Sandbox → Performance → Security → Human Review → Verified
```

**SSOT:** `lib/workspace-engine/extension/submission.ts`

### 7. Main Agent workspace composition

Main Agent does not only invoke tools; it **composes workspaces** from verified artifacts:

```text
Goal → Ontology discovery → Capabilities → View Contracts → Workspace SDK frame → User
```

**SSOT:** `lib/workspace-engine/workspace-composition.ts` — `planWorkspaceFromGoal()`

## Stack diagram

```text
              RIMVIO
                 │
        ┌────────┼─────────┐
        ↓        ↓         ↓
    ONTOLOGY  CAPABILITY  VIEW
        │        │         │
        └────────┼─────────┘
                 ↓
          WORKSPACE ENGINE
                 ↓
             MAIN AGENT
                 ↓
          USER EXPERIENCE
```

## Mapping to existing code

| New concept | Existing module |
|-------------|-----------------|
| Data layer | `context-workspace/workspace-patch`, manifest `data` |
| Object layer | `ContextWorkspaceNode`, `RealityObjectV1` |
| View layer | `workspace-map-view`, `WorkspaceNodeProjectionModel` |
| 6-region frame | `lib/workspace-sdk/` |
| Capability producer | Platform SDK manifest `capabilities[]` |
| Data producer | RDN, manifest `data`, business supply |
| Map pins today | `WorkspaceMapPin` → `GeoObject` adapter |

## Consequences

- Map/Timeline/Graph producers use **View Contract** path, not capability wizard alone.
- Ontology producers register schemas before domain capabilities bind to object types.
- Reviewer standards extend to semantic ontology review + view contract compliance.
- Future: Supabase persistence for ontology registry + verified view extension index.

## Non-goals (this ADR)

- Full View Extension runtime host (manifest `ui` extension loader)
- Supabase migrations for ontology registry
- Automatic Main Agent workspace assembly in production loop (composition planner only)

## References

- `lib/workspace-engine/`
- `lib/hub/standards/` (Producer/Reviewer + WDK guides)
- `docs/adr/034-reality-os-primitives-projection.md`
