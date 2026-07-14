# Rimvio Execution Plan vs Runtime

**Status:** v0 · L3 instance layer  
**Wire SSOT:** `lib/context-execution/`  
**Related:** `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md` · `docs/RIMVIO_EXECUTION_GRAPH.md` · `docs/RIMVIO_ENGINE.md`

---

## Stack

```text
Intent (L1)
    ↓
Blueprint (L2)              — structure: ExecutionGraph nodes · spatial · temporal
    ↓
Execution Plan (L3)         — order · preview · approval · replan
    ↓
Execution Runtime (L3)      — scout · retry · step status · engine turns
    ↓
Commit (L5)
    ↓
Observation · Learning (L4)
```

**Law:** Blueprint never carries Runtime status as SSOT. Plan steps own step lifecycle exclusively.

---

## Objects

| Object | Layer | Mutable by | Storage |
|--------|-------|------------|---------|
| `ContextBlueprint` | L2 | L1 compose only | Blueprint wire |
| `ContextExecutionPlanV1` | L3 | Plan/Runtime modules | `EventCandidate.metadata.contextExecutionPlanV1` |
| `RimvioEnginePlan` | L3 | Engine `plan()` | Engine turn (domain one-shot) |
| `OperatorTurnPlan` | L3 | Operator gate | Ephemeral per turn |

---

## Context OS phases (extended)

```text
intent
  → blueprint_created
  → execution_planned          ← Plan composed · preview
  → plan_waiting_approval      ← optional "좋아, 실행"
  → executing                  ← Runtime
  → execution_prepared
  → waiting_approval           ← Commit gate
  → committed → observed → reacted
```

Code: `lib/context-blueprint/context-run-state.ts`

---

## Travel example (오사카 3박)

**Blueprint:** nodes `trip · prepare · departure · arrival · stay · explore · return`

**Plan preview:**

```text
○ 1. Trip
○ 2. Prepare
○ 3. Departure
○ 4. Arrival
○ 5. Stay
```

**Runtime:** destination confirm → `stay: running`, hotel scout → `stay: prepared` → approval → `stay: done` + `explore: running` → handoff chips → scout → approve → …

**Cursor-style sequencer** (`completeActiveExecutionPlanStepAndAdvance` · `commitContextExecutionPlanFromApproval`):

- One Reality approval completes the **prepared** step only (does not collapse later pending legs).
- Next pending step by `order` starts as `running`.
- `offerPlanStepHandoffAfterAdvance` → **auto-scout** when engine package resolves `scout` (expressReady soft fill); else chips-first handoff.
- Pin-bar claims `requestOperatorAutoRun` (one system Act); compose seed is fallback when pin-bar is not mounted.
- Destination jump marks skipped early legs (`departure`/`arrival`) `done` so stay → explore → return can walk cleanly.

**MEANING why-line** (`resolveContextMeaningWhyLine`):

- Plan strip: `연결 민수 = 제주` — why this Plan exists for the user.
- Discovery candidates: `민수 = 제주 · {reason}` on reel / infinite feed reason lines.
- Feed related strip already surfaces the same label.

**Step approval loop** (`prepared → approve → done → next running`):

- Engine `scout_complete` / `main_selected` → step `prepared` (Event SSOT).
- Session merges fresher Event plan (`preferFresherExecutionPlan` · `EVENT_CANDIDATES_UPDATED`).
- Hub **이 단계 확정** / Field Reality Commit → `completeActiveExecutionPlanStepAndAdvance` (never completes bare `running`).
- Next pending by order → `running` + handoff chips.
- Reality queue while `executing` only lists Commit-ready/blocked steps.

**Plan schedules Engine** (`resolveScheduledEngineIdFromExecutionPlan` · `planRimvioEngineTurn`):

- Active `running` step's `engineId` is tried **before** global engine priority.
- Soft continue (no other domain detect) → handoff seed utterance for that Engine.
- Clear domain pivot (another engine detects) still overrides the schedule.

**Engine turn → Plan (scout failure):**

```text
recordEngineScoutFailureClient({ engineId, lastError })
  → contextEngineEventsV1 append (kind: scout_failed)
  → applyEngineTurnToExecutionPlanMetadata
  → advanceContextExecutionPlanStep(nodeId, status: blocked)
  → commitEventUpsert (same metadata commit)
```

Call sites: `commit-one-shot-lodging-main-offer-client` · `commit-one-shot-trip-experience-main-client` · `globe-context-condition-pin-bar` (parallel scout empty).

---

## Modules

| Module | Role |
|--------|------|
| `build-context-execution-plan.ts` | Blueprint → Plan |
| `advance-plan-step.ts` | Runtime step advance |
| `apply-engine-turn-to-plan.ts` | Engine event → `advanceContextExecutionPlanStep` |
| `read-active-plan-step.ts` | Active step · effective status |
| `format-plan-preview-ko.ts` | Hub / approval preview lines |
| `patch-travel-plan-destination.ts` | Travel destination advance |

---

## UI integration

- `GlobeContextHubPlanStrip` — Hub rail "예상 실행" preview + **좋아, 실행** when `plan_waiting_approval`
- `useRealitySurfaceProjection().approveExecutionPlan` — approves plan · persists metadata · starts Runtime
- **Persist:** `commitContextExecutionPlan` → `localStorage` (`rimvio-event-candidates.v1`) + vault queue → Supabase when online
- **Vault mirror key:** `metadata.contextExecutionPlanV1` (allowlisted in `life-event-vault-snapshot.ts`)
- `RealitySurfaceSession.executionPlan` — client session carries Plan instance
- `GlobeContextHubRail.executionPlan` — prop with fallback to metadata · blueprint compose
- `composeRealitySurfaceFromGlobeIngress` — builds Plan on ingress
- `advanceRealitySurfaceDestination` — patches Plan (Blueprint structure only)
- Container AI reads effective step status via `readContainerAIContext({ executionPlan })`
