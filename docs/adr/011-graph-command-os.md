# ADR-011: Natural Language = Graph Command OS

**Status:** accepted 2026-07  
**Wire:** `lib/graph-command/` · `lib/context-run/plan-context-run.ts` · `lib/context-run/dispatch-context-run.ts`

## Context

Globe NL was routing into discovery/search feeds (Context Condition scout → feed gate → infinite feed). That made Rimvio look like a map search app. Product law: **utterance edits a spatial context graph**, not “return 10 results.”

## Decision

1. **Graph Command IR (L1)** — `pin_node` · `search_project` · `filter` · `compare` · `reserve_prep` (v1 slice). Parser is deterministic Korean; no Maps/booking in L1.
2. **Session Graph store** — keyed by `contextEventId`; map markers and Place Action Graph project from this SSOT.
3. **Composer / Context Agent gate** — matched commands apply via Projector (L3); free-NL Context Condition scout is **frozen** when a graph command matches.
4. **`reserve_prep` only prepares** — Execution Inbox; Reality Commit stays Field / human.

## Consequences

- Chat replies are one L1 confirmation line (고정 · 펼침 · 걸러내기) — not recommendation dumps.
- UI must never say Ontology / Entity / Graph Command.
- PR reject: free-NL that opens infinite discovery feed as the default outcome when a Graph Command would apply.

## Reject in review

- NL → recommendation list as primary answer
- Auto Reality Commit from graph commands
- Inline chat mini-map widget as hero (Globe is the canvas)
- L1 parser importing lodging/eatery scout runners

## Amendment — Action Planner + Tool Registry (2026-07)

- Compound NL (`비교해서 … 예약`) → `lib/action-planner` Plan steps before Tools/Graph run.
- Tools live in `lib/tool-registry` (`maps.search` · `hotel.lookup` · `restaurant.lookup` · `ranking.pick` · `booking.prepare`).
- Runtime stops at `wait_commit`; Field Reality Commit remains human-gated.
- Ranking/Reasoning only when a Plan step requests them — not on bare `pin_node`.
- **Diff bundle (2026-07):** working-set soft IR (`pin`×N + `compare`) flushes as **one** `applyGraphCommands` + one Search `lastBatch`; `reserve_prep` / `wait_commit` stay Field gate.

## Amendment — Engine map vertical (2026-07)

Ordered delivery of Context OS engines:

1. **Intent** — IR v2: delete/group/move/note/style/visibility/share/reason_pick/simulate  
2. **Entity Resolver** — `resolveGraphEntity` (pin/selection/distance weights)  
3. **Graph Engine** — session graph + localStorage durable mirror  
4. **Context Engine** — `moveNodeToProjectContext` + projectFolders  
5. **Search Engine** — `runPlaceSearch` (seed; Maps adapters later)  
6. **Reasoning** — `reason_pick` only with compare/selection  
7. **Agent Runtime** — `runBookingPrepareAgent` prepare-only  
8. **Simulation** — `simulate` op (shadow node, no Commit)  
9. **Reality Commit** — `assertHumanRealityCommit` gate  
10. **Globe + Plan card** — session markers SSOT + `GlobeActionPlanCard`

## Amendment — Rule Engine Constitution (ADR-012)

- Law above engines: **Context First → Graph First → Action First → Reason Later**
- SSOT: `lib/rule-engine/` · Clarify Less · Commit-required intents · Tool Router
- Free-NL LLM only when `allowLlmReasoning` (Analyze / Predict / Unknown without Action)

## Amendment — Cursor isomorphism (ADR-013)

- Context Builder packs **relevant nodes only** before Planner/Tools (`lib/context-builder/`)
- Cursor Diff accept ↔ Rimvio Field Commit

