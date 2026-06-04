# Rimvio Loop Wiring System V1 — Report

**Date:** 2026-06-04  
**Role:** Real-world signals → LoopCandidate → Priority Engine → one active Killer Loop

---

## 1. Signal → Loop Mapping

| Loop | Triggers |
|------|----------|
| **MORNING_LOOP** | `first_unlock`, `wake_window`, `commute_window`, `calendar_proximity`, `alarm_fired` |
| **TRANSIT_LOOP** | `navigate_intent`, `map_search`, `commute_window`, `calendar_proximity` + GPS reinforce |
| **INTERRUPTION_LOOP** | `notification_received`, `message_activity`, `alarm_fired`, `lunch_window` |
| **EVENING_LOOP** | `evening_idle_window`, `idle_duration`, home/stationary GPS reinforce |

---

## 2. Wiring Pipeline

```text
LoopWiringInput (time / system / behavior / location facts)
        ↓
collectTriggerSignals()
        ↓
signalToLoopCandidates()   (each signal → ≥1 candidate)
        ↓
mergeLoopCandidates()      (per loopType, probabilistic OR)
        ↓
selectActiveLoop()         (exactly ONE active)
        ↓
commitLoopWiringFrame()    (hot read, not SSOT)
```

---

## 3. Rules Enforced

| Rule | Implementation |
|------|----------------|
| No manual activation | No `activateLoop` in app/hooks; tests scan repo |
| GPS not primary | `reinforcementOnly` on location signals |
| Orphan signals | `SIGNAL_REGISTRY` covers all `SignalKind` values |
| Priority engine | `selectActiveLoop` — score × loop priority weight |
| Candidates not executed | Wiring outputs frame only; execution is future Killer runtime |

---

## 4. Integration Points

| Consumer | API |
|----------|-----|
| Client hook | `useLoopWiring(input)` |
| Execution bridge | `wireLoopFromCapabilityExecution()` |
| Tests | `npm run test:loop-wiring` |

---

## 5. Production Readiness

| Area | Score |
|------|-------|
| Signal catalog | 9/10 |
| Determinism | 9/10 |
| GPS hybrid | 8/10 |
| Live GPS/time ingestion | 5/10 — pass facts via `LoopWiringInput` |
| Killer loop runtime UI | 4/10 — wiring only in V1 |

**Overall: 7.5/10** — wiring layer ready; connect PWA geolocation + notification listeners in V2.

---

## Success Condition

✅ Loops derived from signals only  
✅ No manual loop activation API  
✅ Every signal kind mapped to loops  
✅ One active loop when confidence threshold met
