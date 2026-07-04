# ADR-004: Situation Projection Layer (Solid vs Ghost)

**Status:** accepted 2026-07  
**Spec:** `docs/RIMVIO_SITUATION_PROJECTION_LAYER.md`  
**Code:** `lib/situation-projection/`

## Context

Users need **direction** for resources they have not captured yet (insurance, schedule, cost) while keeping **committed truth** auditable. AI should **compose UI** (mind-map, prep card) without writing fake graph edges.

## Decision

Insert **Situation Projection** between **RECALL** and **ACTION** in the Experience stack:

```text
RECALL → SITUATION PROJECTION → ACTION
```

- **Solid nodes** — EventCandidate + entity graph evidence  
- **Ghost nodes** — playbook catalog only (`virtual: true`)  
- **Projection links** — `rimvio.situation-projection.v1` only  
- **Promote** — user confirm → `commit-truth` → entity graph  

LLM may later choose `surfaceKind` and layout order among enums; LLM must not create ghost axes outside playbook or commit truth.

## Consequences

| Store | Ghost allowed? |
|-------|----------------|
| `rimvio.entity-graph.v1` | No |
| `rimvio.situation-projection.v1` | Yes (manifest only) |
| EventCandidate | Only via commit-truth |

## Deferred

- Situation map UI sheet  
- AI layout pass hook  
- `@` featureId binding per ghost axis (registry expansion)
