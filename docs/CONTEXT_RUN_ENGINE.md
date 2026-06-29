# Context Run Engine

> **Status:** 2026-06 — **shipped** (Phases 1–5) · ingress + watcher + ESLint guards  
> **Constitution:** [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) § North Star

## One line

All ingress → **Context Run Engine** → derived graph → question → decision → **Commit** → projection → Watcher → reconstruct.

## Stack

```text
All ingress (text · voice · photo · button · Share · API · automation)
        ↓
Context Run Engine (Situation bind + Planner)
        ↓
Derived Execution Graph  ← ephemeral; rebuilt from Truth + RunState
        ↓
Question Engine          ← missing constraint slots only
        ↓
Execution Decision       ← auto · ask · recommend · approval_required  ★
        ↓
Surface Resolver         ← one primary surface per turn  ★
        ↓
Execute                  ← Search · Field · API (no truth write)
        ↓
Commit                   ← sole truth writer (Decision-gated)
        ↓
State Projection         ← Feed · Globe · Dashboard · Field ingress
        ↓
Watcher
        ↓
Context Run Engine       ← reconstruct, not resume snapshot
```

## Execution Decision + Surface Resolver (locked)

**Code SSOT:** `lib/context-run/execution-decision.ts` · `surface-resolver.ts` · `commit-gate.ts`

### Decision layer

| Input | Function | Output |
|-------|----------|--------|
| Risk op (publish / pay / handshake) | `decideRiskOperation` | always `approval_required` |
| Unfilled slot | `decideSlotExecution` | `ask` |
| Graph node | `decideNodeExecution` | per registry |
| Composer phase | `decideComposerExecution` | per registry |
| Combined turn | `decideRunTurn` | **strictest** wins |

**Risk operations (never auto without envelope or approval):**

- `publish_listing` · `publish_external` · `payment` · `handshake_confirm` · `send_external`

**Auto envelopes (documented product permission only):**

- `market_quick_list_one_liner` — one-line @중고 / NL quick list → external publish
- `context_text_ingest` · `photo_attach` · `gps_dwell_confirm`

### Surface Resolver layer

| Decision | Allowed primary surfaces |
|----------|-------------------------|
| `ask` | question_card · execution_card · portal |
| `approval_required` | **approval_dialog only** |
| `recommend` | portal · field_discovery_ingress · execution_card · hub_peek |
| `auto` | map_focus · progress · toast_only · dashboard_highlight |

`resolvePrimarySurface()` → `{ decision, surface, effect, commitPermitted }`  
`assertSurfaceMatchesDecision()` — PR reject if UI opens wrong surface for Decision.

### Commit gate

All truth writes call `assertCommitPermitted({ risk, approvalGranted?, autoEnvelope? })` first.

| Path | Gate |
|------|------|
| Wizard confirm + external publish | `approvalGranted: true` |
| Quick list one-liner | `autoEnvelope: market_quick_list_one_liner` |
| Internal market save | `risk: none` |
| Raw `publishExternal` without approval | **throws** `ContextRunCommitBlockedError` |

**PR reject:** Portal / Field / map opens **and** Commit in same turn without Decision record · `approval_required` surface skipped · chat thread instead of Surface Resolver.


## Role separation (non-negotiable)

**The LLM must not become the Planner.** If the model chooses “ask price” vs “publish now”, policy is lost in weights.

| Role | Owns | Must not |
|------|------|----------|
| **Planner** | Goal, rules, derived graph from Truth + RunState | User-facing prose |
| **Question Engine** | Which slots are unfilled | Wording (LLM) · commit |
| **Execution Decision** | Auto / approval / re-ask | Ad-hoc model judgment |
| **LLM** | Parse language; natural questions; explain results | Goal, slot order, publish/pay without Decision |
| **Commit** | `Event`, `MarketIntent`, `Reservation`, `Ledger` | — |
| **Projection** | Surfaces | Any truth write |

## Durability

- **Execution is disposable. Truth is durable.**
- **RunState** (minimal): `graphId`, `goal`, `status`, `resumeHint`, `lastVisitedNode`, `updatedAt`
- **Reconstruct test:** *Can this execution be reconstructed tomorrow?*

## PR checks

1. Single ingress — no parallel composer / wizard / ingest brains  
2. Commit before projection side-effects  
3. *Can this execution be reconstructed tomorrow?*  
4. LLM diff does not change Decision outcomes for same Truth + RunState  

**Execution Surface guardrails (G1–G10):** [GLOBE_EXECUTION_SURFACE_UX.md](./GLOBE_EXECUTION_SURFACE_UX.md) · Shell: [GLOBE_PROMPT_SHELL.md](./GLOBE_PROMPT_SHELL.md)

## Code map (shipped 2026-06)

| Layer | Module |
|-------|--------|
| **Single ingress** | `dispatchContextRun()` — `lib/context-run/dispatch-context-run.ts` |
| Ingress types | `lib/context-run/ingress-types.ts` — text · photo · share · gps_dwell_confirm |
| Situation bind | `lib/context-run/bind-situation.ts` |
| Planner | `lib/context-run/plan-context-run.ts` · `plan-mention-contract.ts` |
| RunState | `lib/context-run/run-state-store.ts` — sessionStorage pointer |
| Commit adapters | `commit-text-context.ts`, `commit-mention-context.ts`, `commit-gate.ts` |
| Surface Resolver | `surface-resolver.ts`, `resolve-globe-composer-surface.ts` |
| Decision | `execution-decision.ts` |
| Projection | `execution-feed-bridge.ts`, `execution-feed-reducer.ts`, `components/globe/execution-feed/` |
| Watcher | `watcher-reconstruct.ts` — RunState → Feed reconstruct (G8) |
| Lifecycle | `execution-feed-lifecycle.ts` — TTL dismiss · `finishContextRun()` |
| Market feed sync | `sync-market-compose-to-feed.ts` — wizard step live sync |
| Experience run | `lib/experience-run/` — CaptureSheet agent pipeline (via dispatch) |
| Question Engine | `lib/globe/market/question-engine/` |
| Commit (truth) | `lib/source-of-truth/commit-truth.ts` + domain commit modules |

### UI ingress (must use `dispatchContextRun`)

| Surface | File |
|---------|------|
| Globe composer | `globe-context-ingest-bar.tsx` |
| CaptureSheet ask | `capture-sheet.tsx` |
| Photo attach button | `globe-context-photo-button.tsx` |
| GPS dwell inbox | `globe-inbox-sheet.tsx` |
| Portal text commit | `commitTextContextIngress()` in `globe-home-client.tsx` |

ESLint blocks direct `ingestGlobeContextFromText` / `runGlobeMapIntentSupply` in `components/globe/**`.
