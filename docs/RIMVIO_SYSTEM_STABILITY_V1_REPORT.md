# Rimvio System Stability Layer v1

## Mission

Transform the real-time behavioral OS into a **stable** cognitive operating system: no loop thrashing, no UI flicker, graceful degradation under load, deterministic replay.

## Pipeline

```
Realtime Signal Stream
        ↓
Signal Debouncer (merge / compress)
        ↓
Loop Wiring Engine
        ↓
Loop Stability Guard (hold / hysteresis / cooldown / oscillation)
        ↓
Active Loop
        ↓
Surface Override Engine
        ↓
Surface Flutter Protection (frame lock)
        ↓
Adaptive Resolution (load-based degrade)
        ↓
Surface Composition → UI
```

## Modules (`lib/stability/`)

| Module | Role |
|--------|------|
| `signal-debouncer.ts` | 10 pulses in 3s → 1 weighted intent |
| `loop-stability-guard.ts` | 8s hold, 0.15 hysteresis, per-loop cooldown, oscillation block |
| `surface-flutter-protection.ts` | 16ms commit gate, primary-only under load |
| `system-load-controller.ts` | Ingest / switch / recompose pressure |
| `adaptive-resolution-engine.ts` | LOW → CRITICAL degradation table |
| `stability-pipeline.ts` | `processStableRealtimeTick` orchestration |
| `deterministic-replay.ts` | Fixed-clock replay for tests |

## Load table

| Level | Behavior |
|-------|----------|
| LOW | Full real-time loop |
| MEDIUM | 250ms tick batching hint |
| HIGH | Freeze loop switch, pause learning, primary only |
| CRITICAL | Static primary action only |

## Integration

- `realtime-loop-orchestrator.ts` → `processStableRealtimeTick`
- `learning-engine.ts` → skips ingest when `learningPaused`
- `hooks/use-realtime-surface-composition.ts` → adaptive tick interval

## Tests

```bash
npm run test:stability
```
