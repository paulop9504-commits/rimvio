# Rimvio Agent Platform — Phase 0 Repository Audit

**Status:** Phase 0 (audit only — no implementation in this doc)  
**Date:** 2026-08-31  
**Principle:** Preserve Experience OS · evolve with minimal change · no AGI infrastructure

---

## 1. Executive summary

Rimvio **already has** most of the bones for an Agent + Capability platform:

- **One Agent Runtime** (`lib/workstream/rimvio-agent-runtime.ts`, ADR-045)
- **Hub Capability Index + Discovery** (`lib/platform-sdk/`)
- **Loop builder engine** (`lib/agent-os/loop-builder/`)
- **Experience OS spine** (Enrichment → `@` registry → Action, frozen)
- **Execution attribution schema** (`capability_executions` migration)

What is **missing or disconnected**:

- Dev Hub UI sandbox is **wired** to `lib/sandbox/` session API + Playwright/simulated browser (`hotel.search`, `hotel.detail`)
- Explorer reads **capability-index** via `lib/capability-core/`
- **Legacy** `sandbox-preview.ts` remains for `?full=1` Hub workspace only
- **Four capability namespaces** use the same word with different meanings (confusion risk)
- **Loop persistence** is in-memory only
- **MVP capability-store** duplicates capability-index
- Main Agent discovery exists; **publish → discover → execute** E2E is not closed in one user flow

**Do not:** replace Experience OS, add k8s/vector DB/multi-agent swarm, or create a second Agent runtime.

---

## 2. Current system map

### Frontend

| Surface | Route | SSOT | Role |
|---------|-------|------|------|
| Agent Home | `/` | `app/page.tsx`, `components/agent/` | User experience — goals, discovery cards |
| Globe (legacy) | `/?surface=globe` | `globe-home-client.tsx` | Spatial recall, composer |
| Share → Now | `/share`, `/now` | `app/share`, `app/now` | Deterministic link → enrich → CTA |
| Field / Peers | `/field`, `/peers` | surface registry | Execution monitor, people |
| **Dev Hub** | `/hub/workspace` | `RimvioDevAgentApp` (default) or `?full=1` → `HubDevWorkspace` | Developer experience |
| Hub home | `/hub` | `hub-dev-platforms-home` | Platform list |
| Dev Agent (dev-only) | `/dev/rimvio-dev-agent` | same as workspace default | `requireDevPage()` in layout |

### Backend / lib layers

| Layer | Path | Purpose |
|-------|------|---------|
| **Agent Runtime** | `lib/workstream/` | ADR-045 spine: Observe→Judge→Plan→Execute→Verify→Commit |
| **Product pipeline** | `lib/context-run/agent-product-pipeline.ts` | `beginAgentProductTurn` stage tape |
| **Hub agent** | `lib/hub/dev/hub-agent-*` | Dev context loop, tools, planner |
| **Agent OS boundary** | `lib/agent-os/` | Main/Hub/Worker roles, loop-builder, decision engine |
| **Platform SDK** | `lib/platform-sdk/` | Manifest, capability-index, discovery, host invoke |
| **Consumer capabilities** | `lib/capability-registry/` | NAVIGATE, CALL, BOOK_FLIGHT… dispatch |
| **Action OS** | `lib/action-registry/` | `@` contracts, prep surface MAIN |
| **Enrichment** | `lib/enrichers/` | Generic → Domain → Intent → actions[] |
| **Orchestrator** | `lib/action-chat/orchestrator/` | Tier gates before LLM |
| **Context / Workspace** | `lib/context-workspace/`, `lib/context-run/` | Truth SSOT, Globe ingress |
| **Loop engine** | `lib/agent-os/loop-builder/` | Generate, lint, compile, test, package |
| **Sandbox (real path)** | `lib/hub/dev/sandbox-preview.ts` | Platform host invoke + execution log |
| **Sandbox (mock UI)** | `lib/dev/rimvio-dev-agent/` | Timer-based OsakaStay demo |
| **Ledger / attribution** | `lib/capability-ledger/`, migration `075` | execution → capability → creator |
| **PC local agent** | `lib/pc-local-agent/`, `app/api/pc-agent/` | Future local runtime (interface only for now) |

### Database

| Store | Technology | Notes |
|-------|------------|-------|
| Hub capability index | localStorage `rimvio.hub.capability-index.v2` | Agent discovery SSOT (MVP) |
| Platform registry | localStorage | Hub platform drafts |
| Loop definitions | **In-memory Map** | Not persisted |
| Action `@` registry | localStorage `rimvio-action-registry.v1` | Action OS spine |
| Workstream / goal | localStorage | Agent execution state |
| `capability_executions` | Supabase | creator attribution foundation (no payments) |
| Links / auth | Supabase | Consumer product data |

### Tests

- `npm test` — ~40 suites, 1200+ script tests
- Agent/Hub gates: `test:agent-os-p0`…`p12`, `test:hub-dual-experience`, `test:capability-ledger`
- Spine guards: `test:spine-mention-prep-e2e`, `test:tab-architecture`, `verify:rimvio-v1`
- **Rule:** all existing tests must stay green after each phase

### Deployment

- Next.js 16 App Router, Vercel (`vercel.json` → icn1)
- Android/Capacitor: Share Target bridge (`android/`, `capacitor.config.ts`)

### Cursor rules (architectural constraints)

34 rules under `.cursor/rules/` — especially:

- `rimvio-one-agent-runtime.mdc` — no parallel runtime
- `rimvio-dual-experience.mdc` — one agent, two experiences
- `action-os-spine.mdc` — frozen `@` registry loop
- `rimvio-agent-runtime.mdc`, `rimvio-context-workspace.mdc`
- `rimvio-platform-sdk.mdc`, `rimvio-dev-agent-os.mdc`

---

## 3. Capability namespaces (do NOT merge blindly)

| Namespace | Example IDs | Module | Consumer |
|-----------|---------------|--------|----------|
| **Hub published** | `hotel.search`, `market.search` | `platform-sdk/capability-index` | Main Agent discovery |
| **Consumer catalog** | `NAVIGATE`, `CALL` | `capability-registry` | Deeplink / dispatch |
| **Runtime stages** | `booking`, `lodging` | `workstream/agent-capability-registry` | ADR-045 stages |
| **Action OS `@`** | featureId contracts | `action-registry` | Prep surface / spine |
| **Hub dev tools** | `workspace.inspect` | `agent-os/decision-engine/capability-catalog` | Dev Agent planner |
| **MVP demo** | `product.search` | `hub/dev/mvp/capability-store` | **Duplicate — remove** |

**Target:** Hub Capability becomes first-class (`id`, `creatorId`, schemas, status). Consumer `@` and runtime stages **stay separate** — document mapping, don't unify IDs.

---

## 4. KEEP / MODIFY / MOVE / SIMPLIFY / DELETE / NEW

### KEEP (sacred — do not remove)

- Entire **Experience OS** path: Share→Now, enrichers, orchestrator tiers, EventCandidate, `@` registry
- `lib/workstream/rimvio-agent-runtime.ts` + spine law
- `lib/context-run/dispatch-context-run.ts`, `lib/context-workspace/`
- `lib/platform-sdk/capability-index.ts` + `discover-capabilities.ts`
- `lib/agent-os/loop-builder/` engine
- `lib/enrichers/`, `lib/action-registry/`
- `docs/RIMVIO_DUAL_EXPERIENCE.md`, ADR-058, product constitution
- Android share bridge, surface IA registry
- All existing tests (do not weaken)

### MODIFY (incremental)

| Item | Change |
|------|--------|
| `use-dev-agent-runtime.ts` | Wire to `sandbox-preview.ts` + `invoke-dev-capability` — keep UI, replace mock timers |
| `hub/dev/mvp/capability-store.ts` | **Merge into** capability-index publish path; delete duplicate |
| `loop-builder/store.ts` | Persist to localStorage |
| `RimvioDevAgentApp` | Single Dev Hub entry; real execution backend |
| `globe-capability-discovery-turn.ts` | Ensure published caps from Dev Hub appear (already reads index) |
| Capability type | Extend index entry with `creatorId`, `verificationStatus` (lightweight) |
| `capability-ledger` | Wire execution records on every sandbox/test invoke |

### MOVE (conceptual, not file churn)

- Dev Hub UX: `/hub/workspace` = **Rimvio Dev Agent** (reference design)
- Full platform builder: `/hub/workspace?full=1` (power users)
- Document "Hub Experience Builder" vs consumer EXPERIENCE layer naming

### SIMPLIFY

- One sandbox UX (mock vs real) → **one path**
- Hub workspace 20+ panes → Dev Hub MVP nav: Capabilities · Loops · Sandbox · Registry
- `hub/dev/mvp/*` panels → fold into dev-agent components after wire-up

### DELETE (after migration)

- `lib/hub/dev/mvp/` once capability-index is sole store
- Mock-only code paths in `use-dev-agent-runtime` after real wire-up
- Do **not** delete `HubDevWorkspace` — demote to `?full=1`

### NEW (minimal)

| File / area | Purpose |
|-------------|---------|
| `lib/capability-core/types.ts` | Thin Capability + Loop types (wrap platform-sdk, not parallel) |
| `lib/capability-core/registry.ts` | Re-export + extend capability-index (single import surface) |
| `lib/sandbox/sandbox-runner.ts` | Abstract interface: `runSandbox(capabilityId, input)` — Playwright later |
| `docs/CAPABILITY_ARCHITECTURE.md` | Short — after Phase 2 |
| `docs/LOOP_ARCHITECTURE.md` | Short — after Phase 7 |
| `docs/SANDBOX_ARCHITECTURE.md` | Short — after Phase 4 |

**NOT new:** k8s, vector DB, payment service, multi-agent orchestrator, event bus.

---

## 5. Target evolution (Experience OS + Agent OS)

```text
CURRENT (preserve):
  Context → Enrichment → @ Action → User

ADD (layer on top, not replace):
  Context → Goal/Intent
         → Main Agent (existing runtime)
         → Capability Discovery (platform-sdk)
         → Loop Planning (loop-builder)
         → Capability Execution (platform-host / capability-runtime)
         → Action / Result
         → Memory (existing preference-graph, workstream — no new vector DB)

SUPPLY SIDE (Dev Hub):
  Creator → Dev Agent → Capability → Sandbox → Verify → Publish → Registry
                                                              ↓
                                                    Main Agent discovers
```

Deterministic path **wins first** (orchestrator tiers, `@` registry). LLM only where reasoning needed (ADR-049).

---

## 6. Conflicts with target architecture

| Conflict | Resolution |
|----------|------------|
| Mock Dev Agent vs real Hub sandbox | Wire mock UI to `sandbox-preview` |
| MVP Coupang UI vs OsakaStay reference | **OsakaStay reference is canonical** Dev Hub UX |
| Capability tied to Platform in manifest | ADR-059: evolve toward standalone Capability; index already supports `origin: standalone` |
| Loop in-memory | Persist before Loop MVP |
| Dev page 404 in prod | `/hub/workspace` is public Dev Hub; `/dev/*` stays dev-gated |
| Four capability registries | Document + `lib/capability-core/` facade — no big-bang merge |

---

## 7. Minimal migration plan (phases 1–8)

### Phase 1 — Architecture cleanup (1–2 days)

- Add `docs/RIMVIO_AGENT_PLATFORM_AUDIT.md` (this file) ✓
- Add `lib/capability-core/` re-export facade
- Remove `hub/dev/mvp/` duplicate store (after index wire)
- Document capability namespace map in `CAPABILITY_ARCHITECTURE.md` stub

### Phase 2 — Capability core (2–3 days)

- Extend `CapabilityIndexEntry` with `creatorId`, `verificationStatus`, `version`
- Single publish path: Dev Hub → `hub-publish-flow` → index (already exists)
- Execution record on test: `capability-ledger` + optional Supabase insert

### Phase 3 — Dev Hub UI (already ~80% built)

- **Keep** `RimvioDevAgentApp` three-column layout (reference image)
- Wire chat commands → `hub-agent-loop` or thin wrapper → sandbox runner
- Status strings: UNDERSTAND→PLAN→BUILD→RUN→VERIFY→PUBLISH (UI only)

### Phase 4 — Live sandbox (critical)

- Interface: `lib/sandbox/sandbox-runner.ts`
- Phase 4a: Keep animated OsakaStay (current) + real SDK invoke in parallel
- Phase 4b: Optional Playwright route (`/api/hub/dev/sandbox/run`) — **only if simple**
- Activity log = execution log SSOT (`hub/dev/execution-log.ts`)

### Phase 5 — Verification

- Gate publish: input ok + execution completed + output schema valid
- UI: BUILD ✓ SANDBOX ✓ VERIFY ✓ PUBLISH ✓

### Phase 6 — Publish

- Already: `hub-publish-flow.ts`, `registerCapabilityIndexFromManifest`
- Connect Dev Agent "Publish" button → existing flow

### Phase 7 — Loop

- Persist loops; simple vertical UI (reference + loop-builder)
- Run loop = ordered capability invokes via sandbox runner

### Phase 8 — Main Agent integration

- Already: `planCapabilityDiscovery`, `globe-capability-discovery-turn`
- Close E2E: publish in Dev Hub → discovery on Agent Home / Globe
- Execute via `resolve-capability-execution` (existing)

**STOP after Phase 8** unless explicitly requested.

---

## 8. Exact files to touch (first implementation sprint)

| Priority | File | Action |
|----------|------|--------|
| P0 | `lib/dev/rimvio-dev-agent/use-dev-agent-runtime.ts` | Replace mock timers with sandbox-preview calls |
| P0 | `lib/hub/dev/sandbox-preview.ts` | Export stable `runDevAgentSandbox(input)` |
| P0 | `lib/hub/dev/mvp/capability-store.ts` | DELETE after redirect to index |
| P1 | `lib/agent-os/loop-builder/store.ts` | Add localStorage persist |
| P1 | `lib/platform-sdk/capability-index.ts` | Add creatorId, verificationStatus fields |
| P1 | `components/dev/rimvio-dev-agent/dev-agent-chrome.tsx` | Publish → hub-publish-flow |
| P2 | `lib/capability-core/index.ts` | NEW facade |
| P2 | `lib/sandbox/sandbox-runner.ts` | NEW interface |
| P2 | `app/api/hub/dev/sandbox/run/route.ts` | NEW optional Playwright (Phase 4b) |

**Do not touch in Phase 1:** `lib/enrichers/`, `lib/action-chat/orchestrator/tiers/`, `lib/workstream/rimvio-agent-runtime.ts` internals.

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Breaking Share→Now / orchestrator | No changes to enricher or tier order |
| Second registry confusion | `capability-core` facade + docs |
| Over-engineering sandbox | Interface first; Playwright optional |
| Dev Hub breaks consumer prod | Dev routes isolated; index is client localStorage |
| Test suite regression | Run `npm test` + `test:hub-dual-experience` each phase |
| Cursor adds k8s/RAG | This audit + rules explicitly forbid |

---

## 10. Test strategy

After each phase:

```bash
npm test
npm run test:hub-dual-experience
npm run test:capability-ledger
npm run test:agent-os-p2-capability-discovery
npm run test:spine-mention-prep-e2e   # Experience OS guard
npm run verify:rimvio-v1             # if touching ingress
```

New tests (minimal):

- `scripts/test-dev-hub-publish-discovery-e2e.ts` — publish → index → discover
- `scripts/test-sandbox-runner-contract.ts` — sandbox interface

---

## 11. Final acceptance test (MVP)

1. Open `/hub/workspace`
2. Create Capability via Dev Agent chat
3. Sandbox shows live OsakaStay execution (agent cursor + results)
4. Verification passes
5. Publish → appears in Registry (capability-index)
6. Main Agent discovers capability (`planCapabilityDiscovery`)
7. Main Agent can execute (existing resolve path)

---

## 12. Long-term north star (design only — do not build now)

- Local Rimvio Runtime on PC (interface in `lib/rimvio-core/runtime-router.ts` — exists)
- Creator usage → attribution → revenue (`capability_executions` ready)
- Missing capability → Dev Agent request path (`agent-os/capability-development-request.ts` — exists)

**Not building:** AGI, vector memory, multi-agent swarm, payments, k8s.
