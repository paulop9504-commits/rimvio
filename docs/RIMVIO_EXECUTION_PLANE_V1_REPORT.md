# Rimvio Execution Plane V1 — Report

**Date:** 2026-06-04  
**Stack:** Surface → Capability Registry (WHAT) → Execution Plane (HOW) → Provider Adapters

---

## 1. Execution Ownership Map

| Layer | Owns | Must not |
|-------|------|----------|
| **Surface Engine** | Situation + `capabilityId` on primary action | Execute, resolve providers |
| **Capability Registry** | Catalog, validation, provider **selection** | Build URIs, run queue |
| **Execution Plane** | Queue, lifecycle, dispatch, history, adapters | UI, surface ranking |
| **UI** | `dispatchCapability` + `runExecutionJob` observe | Provider URLs, enqueue internals |
| **Learning (future)** | Read `execution-history` only | Direct provider telemetry |

---

## 2. Execution Lifecycle

```text
queued → ready → executing → completed
                         ↘ failed → ready (retry)
                         ↘ cancelled → ready (resume)
```

Deterministic transitions enforced in `execution-lifecycle.ts`.

---

## 3. Queue Model

- In-memory `ExecutionQueue` (`execution-queue.ts`)
- Jobs keyed by `executionId` (`exec-{timestamp}-{n}`)
- Priority sort via capability weights (`execution-priority.ts`)
- `runExecutionQueue()` drains all `ready` jobs in order

---

## 4. Adapter Model

| Adapter | Capabilities |
|---------|----------------|
| `navigate-adapter` | NAVIGATE, MAP, CONFIRM_PLACE, PARKING, TAXI |
| `call-adapter` | CALL, MESSAGE, EMAIL |
| `alarm-adapter` | ALARM, CALENDAR, travel handoffs, SEARCH, LINK, … |
| `document-adapter` | DOCUMENT, SHEET |

Provider URIs live only in `lib/execution/adapters/internal/provider-urls.ts`.

---

## 5. Runtime Flow

```text
UI: dispatchCapability({ capabilityId, inputs })
        ↓
Capability Registry: validate + resolveCapabilityProvider
        ↓
submitCapabilityExecution → enqueueExecution (status: ready)
        ↓
UI: runExecutionJob(executionId)
        ↓
Adapter.buildPayload (already on record) → Adapter.execute → applyExecutionUri
        ↓
markExecutionComplete + appendExecutionHistory
```

---

## 6. Learning Integration Points

`execution-history.ts` stores append-only:

- `executionId`, `capabilityId`, `providerId`, `status`, timestamps, `result`, `error`, `retryCount`

`summarizeExecutionHistory()` exposes:

- success rate, completion count, retry count, provider preference ranking

Future Learning Layer **must** read here — not from UI clicks or raw chat.

---

## 7. Risk Report

| Risk | Mitigation |
|------|------------|
| In-memory queue (no persistence) | V2: IndexedDB / server sync |
| Sync `runExecutionJob` from UI | Matches prior UX; async worker later |
| Legacy `ACTION_INTENT_REGISTRY` | Still in action-dispatcher; migrate behind adapters |
| `resumeExecution` skips strict transition assert | Documented; uses cancelled→ready |

---

## 8. Production Readiness Score

| Criterion | Score |
|-----------|-------|
| Lifecycle + queue | 9/10 |
| Adapter isolation | 9/10 |
| Capability split (WHAT/HOW) | 9/10 |
| History for learning | 8/10 |
| Persistence / retry UX | 5/10 |

**Overall: 8/10** — Execution is first-class; persistence and async workers are V2.

---

## Tests

```bash
npm run test:execution-plane
npm run test:capability-registry
npm run test:mvp
```

**Success condition:** Surface says `NAVIGATE`; Registry says which provider; Execution runs job; Adapter opens URI — UI never names Kakao/Naver/Google.
