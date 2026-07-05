# ADR 008 — Container AI as Operator Surface

**Status:** accepted  
**Date:** 2026-07-06  
**Related:** `docs/RIMVIO_CONTAINER_AI.md` · ADR 005 · ADR 007

## Context

Users saw multiple AI names (Globe AI, Context Condition AI, Brain, Lodging Agent). Chief architect defines **one user-facing AI per active container** — Container AI (product: Trip Assistant) — that orchestrates internal modules while preserving L1–L5 layer law.

## Decision

1. **Globe AI = Architect** — Intent, Blueprint, Container creation (L1).
2. **Container AI = Operator** — single UX inside a container; reads Execution Graph every turn; routes to internal modules.
3. **Context Condition AI** remains **developer/internal name** (L4 react); user never sees it.
4. Internal orchestrator modules: Travel Brain, Execution Graph Reader, Context Condition AI, Domain AI Router, Ghost Pin Generator, Action Composer.
5. **Mandatory gate:** lodging/eatery requests blocked when active node is Prepare (or destination unresolved) — offer destination chips.
6. Wire: `lib/container-ai/` with `readContainerAIContext` + `gateContainerAIRequest`.

## Consequences

- UI eyebrow/copy migrates to Trip Assistant / Container AI summary.
- `GlobeContextConditionPromptFrame` is Container AI shell; internal routing expands over time.
- Globe composer must not hijack in-container prompts.

## Non-goals

- Merging L1 Globe AI into Container AI.
- Auto-commit from Container AI chat.
