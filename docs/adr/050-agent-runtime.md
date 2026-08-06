# ADR-050: Rimvio Agent Runtime (Workspace-centric loop)

**Status:** accepted 2026-08  
**Wire:** `docs/RIMVIO_AGENT_RUNTIME.md`  
**Related:** ADR-013 · ADR-021 · ADR-022 · ADR-023 · ADR-025 · ADR-048 · ADR-049 · ADR-051 · Article 0

## One sentence

> **Rimvio Agent Runtime turns natural language into Workspace Patches and Projections — not chat answers; Commit alone mutates Reality.**

## Decision

Lock the 12-stage runtime for the “난바역 근처 캡슐호텔” class of turns:

Intent → Context → Planner → Discovery → Enrichment → Evaluation → **Workspace Patch** → Projection → Status → Interaction → Prepare → **Reality Commit**

## Thesis

| System | Mutates |
|--------|---------|
| Gemini-style | Answer text |
| Cursor | Files |
| **Rimvio** | **Reality Workspace** |

## Alignment (2026-08)

Roadmap: `docs/RIMVIO_AGENT_RUNTIME_ALIGNMENT.md`

| Layer | Role |
|-------|------|
| ADR-045 spine | Observe→Judge→Plan→Execute→Verify→Repair→Commit |
| ADR-050 product | Intent→Planner→Discovery→Patch→Projection→Prepare→Commit |

Lodging scout must call `planObjectDiscovery` before any tool invoke.

External-world absorb (JR · events · amenity sets) uses **ADR-051 Reality Provider Runtime**
(Need → Provider → Acquire → Normalize → Patch) — not a domain-private overlay path.

## Consequences

- All map/sheet/compare UIs are projections of Workspace SSOT  
- Clear vs soft mutation modes (ADR-048) sit inside stage 7  
- Operating Constitution (ADR-049) constrains every stage  

## PR reject

See `docs/RIMVIO_AGENT_RUNTIME.md` § PR reject.
