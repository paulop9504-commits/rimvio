# Rimvio Learning Layer V1 — Report

**Date:** 2026-06-04  
**Stack:** Execution → Observation → Learning Engine → Preference Weights → Surface Re-ranking

---

## 1. Learning Lifecycle

```text
idle → ingesting → idle        (single observation)
idle → replaying → idle        (deterministic rebuild)
```

Observation types: `execute` | `ignore` | `retry_signal`  
Result status: `success` | `fail` | `cancel`

Weights decay over calendar time unless reinforced (`DECAY_FACTOR_PER_DAY = 0.92`).

---

## 2. Observation Flow

```text
Execution terminal (completed | failed | cancelled)
        ↓
ingestExecutionOutcome(record)     [execution-dispatcher write path]
        ↓
appendObservation + processObservation
        ↓
preference-weights applyWeightUpdate

User ignores primary action (no manual prefs):
observeIgnoredPrimaryAction → negative delta
```

**Contract fields:** `executionId`, `capabilityId`, `surfaceId`, `actionType`, `resultStatus`, `timestamp`, `contextSnapshot` (channel, hourBucket, dateKey, surfaceType, urgencyHours).

Metadata on dispatch: `surfaceId`, `channel`, `dateKey` via `CapabilityDispatchRequest.metadata`.

---

## 3. Weight Evolution Model

| Signal | Delta (approx) |
|--------|----------------|
| Execute success | +0.12 |
| Execute fail | −0.04 |
| Cancel | −0.02 |
| Ignore primary | −0.08 |
| Retry signal | +0.015 (weak) |
| Pattern habit | +0.03 × strength |

- Stored range: **[-1, 1]** per capability (behavioral probability, not user settings).
- Channel and hour-of-day biases are secondary maps.
- `replayLearningFromObservations()` rebuilds identical weights from the same stream (deterministic).

---

## 4. Surface Influence Map

| Component | Role |
|-----------|------|
| `surface-weight-adapter.ts` | **Only** learning export Surface Engine may import |
| `getCapabilityLearningBoost()` | `weight × 18` score points |
| `computeRawPriorityScore()` | Adds boost when `primaryCapabilityId` set |
| `surface-builder.ts` | Passes primary action capability into priority |

Surface Engine does **not** read observation stream or execution history.

---

## 5. Data Boundary Audit

| Layer | Learning may | Learning must not |
|-------|----------------|-------------------|
| Event SSOT | — | Append, import event-store |
| Capability Registry | — | Dispatch, mutate catalog |
| Execution Plane | Receive terminal outcomes via bridge | Enqueue, run jobs |
| Surface Engine | Expose weights via adapter | Ingest, compose, rank writes |
| UI | Call `observeIgnoredPrimaryAction` (future hook) | Set manual preference prefs |

Preference weight store is **derived cache** — rebuildable from observations.

---

## 6. Risk Report

| Risk | Mitigation |
|------|------------|
| Cross-test pollution | `resetLearningEngineForTests()` in tests |
| Stale weights | Time decay + replay API |
| Overfitting single action | Caps at ±1, pattern boost capped |
| Surface–learning coupling | Single adapter import enforced by boundary test |
| Retry double-count | Retry transition does not ingest until terminal fail |

---

## 7. Production Readiness Score

| Area | Score | Notes |
|------|-------|-------|
| Contract stability | 9/10 | Versioned observation + weight snapshot |
| Determinism / replay | 9/10 | Sorted replay, no LLM |
| Boundary enforcement | 9/10 | `test-learning-boundary.ts` |
| Persistence | 4/10 | In-memory only (V2: snapshot file) |
| UI ignore hook | 5/10 | API exists; full adoption pending |
| MVP CI | 9/10 | `test:learning-layer` in verify bundle |

**Overall: 7.5/10** — safe for MVP closed loop; persist weights + wire dismiss UI for production.

---

## Success Condition

✅ System learns from execution outcomes without user preference screens.  
✅ Repeated NAVIGATE success increases surface priority for navigate-primary surfaces.  
✅ Ignored primary actions reduce capability weight.  
✅ Manual preference input is **not** required.
