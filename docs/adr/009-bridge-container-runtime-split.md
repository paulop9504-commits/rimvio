# ADR 009 — Bridge (File) vs Container (Process) + Runtime Session

**Status:** accepted  
**Date:** 2026-07-06  
**Related:** `docs/RIMVIO_BRIDGE_VS_CONTAINER.md`

## Context

Bridge and Container were often the same `EventCandidate` id. Chief architect locks **Memory (immutable truth)** vs **Runtime (mutable state)** and allows **multiple Container sessions per Bridge**.

## Decision

1. **Bridge** = Memory object ≈ OS **File** — `EventCandidate`, question: *What happened?*
2. **Container** = Runtime object ≈ OS **Process** — `ContainerRuntime` + Blueprint, question: *What is happening?*
3. **bridgeId** = stable identity; **runtimeId** = session (e.g. `trip-runtime-001`).
4. **Bridge : Container ≠ 1:1** — same `evt-osaka-trip` may spawn `trip-runtime-001` (2026) and `trip-runtime-002` (2028).
5. **Hard law:** Bridge **never** owns `ExecutionGraph` or Blueprint. ExecutionGraph exists only on Container (via Blueprint).
6. OS table locked: Blueprint = process spec · ExecutionGraph = scheduler · Commit = system call.

## Consequences

- `ContextBlueprint` gains `bridgeId` + `runtimeId`; `ownerContext` deprecated (alias `runtimeId`).
- Globe AI: create/select Bridge, then spawn Container runtime + Blueprint.
- Re-run trip = new runtime, same bridge.

## Non-goals

- Migrating legacy cloud `containers` table.
- Storing ExecutionGraph on EventCandidate metadata.
