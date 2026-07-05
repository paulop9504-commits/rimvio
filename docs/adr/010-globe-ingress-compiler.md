# ADR 010: Globe Ingress Compiler

## Status

Accepted — 2026-07-06

## Context

Rimvio needs a single creation path from user intent to executable OS structure. Previously `planContextRun` routed travel intents directly to `experience_run`, which invoked domain search (lodging/eatery) before execution structure was defined.

## Decision

Introduce **Globe Ingress** as a unidirectional compiler:

```
Intent → Context → Bridge → Runtime → Blueprint
```

- `compileGlobeIngress()`catches this path (pure, no Commit, no domain APIs)
- `planContextRun` returns `globe_ingress` for eligible travel trip intents
- `dispatchContextRun` commits Context at the boundary, syncs structure to feed, does **not** call `resolveExperienceRunTurn`

## Consequences

- Travel trip composer input designs execution structure first
- Domain executors (lodging agent, etc.) run only after Blueprint + phase gate
- Lodging/eatery-only queries remain on legacy `experience_run` until phased migration

## Forbidden

- Blueprint → Runtime re-entry
- Bridge → Intent regression
- Context → Runtime skip (no Bridge)
