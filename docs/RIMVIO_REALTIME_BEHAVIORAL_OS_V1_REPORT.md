# Rimvio Realtime Behavioral OS v1

## Mission

Upgrade from event-driven loop wiring to a **continuous behavioral operating system** that ingests signals in real time and instantly adjusts active loop, surface priority, and composition.

## Architecture

```
Loop Wiring Engine (batch facts)
        ↓
Realtime Signal Stream (`signal-stream-engine`)
        ↓
Device Signal Adapter (`device-signal-adapter`)
        ↓
Realtime Loop Orchestrator (`realtime-loop-orchestrator`)
        ↓
Loop Priority Engine (existing `selectActiveLoop` via `wireKillerLoops`)
        ↓
Stability Guard (`loop-stability-guard`)
        ↓
Active Loop (live store)
        ↓
Surface Override (`loop-to-surface-override`)
        ↓
Surface Composition Runtime
        ↓
UI (`useRealtimeSurfaceComposition`)
```

## Modules (`lib/realtime/`)

| File | Role |
|------|------|
| `signal-stream-engine.ts` | Continuous ingestion, decay, project → `LoopWiringInput` |
| `device-signal-adapter.ts` | Foreground/idle/touch/wake/interrupt → stream + wiring |
| `realtime-loop-orchestrator.ts` | Tick + preemption + store commit + UI event |
| `loop-to-surface-override.ts` | Loop bias on ranked surfaces → recompose |
| `realtime-state-store.ts` | `activeLoop`, `lastSignals`, velocity, stability |
| `loop-stability-guard.ts` | 7s min switch, 0.12 score delta |
| `signal-decay.ts` | Behavior fast / system medium / location slow |

## Rules

1. **No batch** — `ingestStreamSignal` and `pushRealtimeSignal` run `processRealtimeTick` immediately.
2. **Loop preemption** — higher weighted score overrides `activeLoop` when stability allows.
3. **Signal decay** — half-lives: behavior 2m, system 8m, location 20m.
4. **Stability guard** — 5–10s window (default 7s), delta threshold 0.12.
5. **Single context** — one `activeLoop`, one primary surface after override.

## Client hook

`hooks/use-realtime-surface-composition.ts` — 2s tick + `EVENT_REALTIME_UPDATED` for instantaneous UI refresh.

## Tests

```bash
npm run test:realtime
```

Covers ingestion, decay, latency (<300ms), single loop, surface override, stability under burst, preemption.

## Success

- Active loop changes without manual triggers
- Surface graph recomposes on loop switch
- No parallel loop activation in store
- GPS remains reinforcement-only (via loop-wiring)
