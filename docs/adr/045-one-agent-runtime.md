# ADR-045: One Rimvio Agent Runtime

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/rimvio-agent-runtime.ts` · capability registry · memory · bus · health · metrics  
**Related:** ADR-038–044 · Article 0

## One sentence

> **One Agent Runtime. Capabilities via Registry. Never invent another Runtime package.**

## Target shape

```
User → Ingress Router → Rimvio Agent Runtime
         ├ Agent Memory (Goal·Context·Execution·Timeline·Preference·Commit·History)
         └ Capability Registry (Search·Booking·Trip·Vision·Calendar…)
                    ↓
         Observe → Judge → Plan → Execute → Verify → Repair → Commit
                    ↓
              Reality Update & UI
```

## Runtime roles (not separate products)

```
Rimvio Runtime
├ Observer
├ Judge
├ Planner
├ Strategist
├ Executor
├ Verifier
├ Repairer
├ Committer
└ Historian
```

## Law

1. **1순위** — `action-chat` · `context-run` · `engine` · `workstream` all call `enterRimvioAgentRuntime()` (via `spineIngressFromLegacy`).
2. **2순위** — Domain packages (`booking-runtime`, `research-engine`, …) are **Capabilities**, not peer Runtimes.
3. **3순위** — Judge = Complexity → Scope → Risk → **Confidence** → Reality Cost → Strategy.
4. **4순위** — Memory is one bag (`readAgentMemory`).
5. **5순위** — Strategies: Quick · Lookup · Planning · Simulation · Execution · Recovery · Observation.
6. **8순위** — Default loop always includes **Verify** (not an optional side agent).
7. New feature = **stage hook** or **Registry capability** — never `lib/foo-runtime` as a second OS.

## PR reject

- New `*-runtime` / `*-agent` package that bypasses Spine  
- Parallel ingress that skips `enterRimvioAgentRuntime`  
- Booking/Search “Runtime” as a peer to Agent Runtime  
- Hard trip without Verification when strategy requires it  
- Commit with approval `none` when booking in scope
