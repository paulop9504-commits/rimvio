# ADR-016: Context Bloom

**Status:** accepted 2026-07  
**Wire:** `lib/visual-projection/context-bloom-*` · `rimvio-globe-hub` marker press · trip arcs merge

## Context

Permanent ontology edges on the Globe create map clutter. Users need to feel that objects belong to one context without studying a graph. Attention > permanent lines.

## Decision

1. **Context Bloom** — on object select: selected scales (~1.14) + strong glow; related objects bloom in with 100ms stagger; thin relation arcs draw for ~450ms then clear.
2. **No idle lines** — arcs exist only while a selection bloom is active.
3. **Rank top 3–5** related objects by type affinity + proximity (`rankContextBloomRelations`). Never draw every edge.
4. **Line styles** by relation: travel solid · recommend/booking dashed (`signal`) · visited solid green.
5. **Selective segmentation** (`decideSegmentation`) — Projection/Recognition may allow cutout for food/room/landmark; nightscape/beach/market/onsen keep original. Nukki is never mandatory.
6. **Visual Layer rules** — each object type has a preferred subject (restaurant→food, hotel→room, landmark→full building).

## Consequences

- Marker press starts bloom; empty globe press clears it.
- Users remember the *unfolding context*, not the lines.
- At `execution_ready`, a floating Execution strip appears (길찾기 · 예약 준비 · 결재함) — prep only, never auto-Commit.
- Execution CTAs are capability-gated via Reality Object types.

## Reject in review

- Always-on relationship spiderwebs
- Mandatory background removal for all covers
- Bloom that mutates Reality without human Commit
- Showing Execution CTAs before bloom sequence completes
