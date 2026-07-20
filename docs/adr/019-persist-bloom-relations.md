# ADR-019: Persist Context Bloom Relations

**Status:** accepted 2026-07  
**Wire:** `lib/reality-object/persist-bloom-relations.ts` · `startContextBloom(preferredRelated)` · hub marker press

## Context

Context Bloom ranked top 3–5 nearby objects in-session only. Reselecting the same Reality Object re-ranked from scratch and Object Card Nearby could not show a stable neighborhood.

## Decision

1. Extend `RealityObjectRelations` with `edges[]` + `bloomRankedAtIso` (keep `relatedObjectIds`).
2. On bloom start, **read** persisted edges → hydrate against current globe candidates → prefer when ≥2 still match; else live rank (fill gaps).
3. After bloom rank, **write** edges onto the selected Reality Object via `commitEventUpsert` (creates a minimal object if missing).
4. Object Card Nearby continues to read the bloom session (now seeded from persisted edges).

## Consequences

- Re-selecting the same place feels stable (same nearby order when markers still exist).
- Edges are context-event local (user Reality Object), not world-geo Reality Graph.
- Missing candidates on the map simply drop out of hydration; live rank fills.

## Reject in review

- Permanent always-on spiderweb lines from persisted edges
- Writing bloom edges without human-visible select (background crawl)
- Storing world-geo `geo:*` nodes as user Reality Object relations
