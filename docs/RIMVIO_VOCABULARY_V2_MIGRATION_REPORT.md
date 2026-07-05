# Rimvio Vocabulary v2 — Context / Container Confusion Removal Report

**Date:** 2026-07-06  
**Scope:** Audit for v2 refactor · **no mass rename** — wire + docs + report  
**Canonical:** `docs/RIMVIO_CANONICAL_VOCABULARY_V2.md`

---

## Executive summary

| Metric | Finding |
|--------|---------|
| **Context** symbol hits (ts/tsx) | ~400+ files (field names, modules, docs) |
| **Container** symbol hits (ts/tsx/md) | ~30+ distinct meanings in active paths |
| **ExecutionGraph** in code | ~25 blueprint/runtime files (keep wire name; UX → **Flow**) |
| **v2 wire landed** | `contextId` · `bridgeId` · `runtimeId` on Blueprint v7 · `lib/runtime/` · `lib/operator/` · `lib/context-blueprint/flow.ts` |
| **Remaining work** | Legacy modules — rename **on touch** only |

---

## A. Context — multi-meaning scan

| Meaning | Count (approx) | v2 resolution |
|---------|----------------|---------------|
| SSOT globe node (`EventCandidate`) | 200+ files | **Context** · `contextId` |
| Field `contextEventId` | 80+ files | → `contextId` on touch |
| Hub / globe UI "context" | 40+ files | UI label OK if = Context node |
| `Context Run` pipeline | 15+ files | ingress router — not SSOT type |
| `buildContextInstance` etc. | 20+ files | helper names — qualify in doc |
| Personal Context AI | 10+ files | recall product — not Context type |
| Global Brain context block | 5+ files | prompt assembly — not Context type |
| Legacy `context-containers` | 5+ files | **GoalBucket** — not Context |

**Verdict:** Context **is** the SSOT in v2 (was split in v1). **`EventCandidate` type name retained** — semantic alias `ContextRecord`.

**Action:** New APIs **must** use `contextId`. Do not introduce new types named `Context` besides `ContextRecord`.

---

## B. Container — multi-meaning scan

| Legacy use | Path | v2 resolution |
|------------|------|---------------|
| **OS Process (canonical)** | `lib/runtime/` · Blueprint | **Runtime** ✓ |
| `ContainerRuntime` | `lib/container-runtime/` | deprecated alias |
| `ContainerRecord` | `lib/container-store/` | **GoalBucket** — NOT Runtime |
| `ContainerRoute` | `lib/container-rework/` | **DockRoute** — NOT Runtime |
| `LodgingAgentContainer` | `lib/globe/lodging-agent/` | **LodgingAgentScope** — NOT Runtime |
| `containerKind` | Blueprint | → `runtimeKind` on touch |
| Cloud `containers` table | docs/audit | legacy cloud — ignore for OS |
| Hub "functional container" | GLOBE_HUB_RESOURCE | doc: "Hub host" |
| `EventCandidate.containerId` | event row | legacy link to GoalBucket — do not use in OS |
| UI `scrollContainerRef` | React | ignore |

**Verdict:** **Container** banned for OS Process. **Runtime** is canonical.

**Action:** PR reject if new code says `Container` for Process/Runtime.

---

## C. Bridge — v1 → v2 shift

| v1 | v2 |
|----|-----|
| Bridge = `EventCandidate` (File) | **Context** = meaning (content) |
| — | **Bridge** = graph identity linking Contexts |

**Migration:**

- Old code using `bridgeId` as event id → **`contextId`**
- New `bridgeId` = `bridge-{contextId}` default until multi-context graph ships
- **Experience Bridge** remains qualified social protocol

**Files updated in v2 wire:** Blueprint compose · Operator context read · tests

---

## D. Execution Graph → Flow

| Location | Action |
|----------|--------|
| `lib/context-blueprint/execution-graph.ts` | keep wire (internal) |
| `lib/context-blueprint/flow.ts` | **Flow** public alias ✓ |
| User copy / docs | say **Flow** only |
| `execution_graph_reader` module id | rename to `flow_reader` on touch |

---

## E. Container AI → Operator

| Location | Action |
|----------|--------|
| `lib/operator/index.ts` | alias exports ✓ |
| `lib/container-ai/*` | keep path until rename on touch |
| `human-ko.ts` | Trip Assistant label OK |
| UI eyebrow | Operator / 어시스턴트 — not Container AI |

---

## F. Responsibility violations found (fix on touch)

| Violation | Severity | Fix |
|-----------|----------|-----|
| Context metadata may store hub/runtime fields | medium | enforce `assertContextHasNoFlow` at ingest |
| `planContextRun` bypasses Blueprint/Runtime spawn | high | Globe AI migration backlog |
| LodgingAgentContainer name | low | rename to LodgingAgentScope |
| container-store used for chat goals | low | quarantine; not Context OS |

---

## G. Files changed in this refactor (v2 wire)

| File | Change |
|------|--------|
| `docs/RIMVIO_CANONICAL_VOCABULARY_V2.md` | SSOT |
| `lib/context-os/vocabulary-v2.ts` | IDs + guard |
| `lib/runtime/types.ts` | Runtime compose |
| `lib/context-blueprint/types.ts` | Blueprint v7 · contextId |
| `lib/context-blueprint/flow.ts` | Flow aliases |
| `lib/operator/index.ts` | Operator aliases |
| `scripts/test-*.ts` | contextId assertions |

**Not changed (by design):** ~400 Context-prefixed legacy files · `EventCandidate` type name · `lib/container-store/`

---

## H. Verification

```bash
npx tsx scripts/test-context-blueprint.ts
npx tsx scripts/test-container-ai.ts
npx tsx scripts/test-bridge-container.ts
```

All must pass after v2 wire.

---

## I. Recommended next PRs (priority)

1. Globe AI ingress: Intent → Context → Bridge → Runtime → Blueprint (single path)
2. Prompt frame: wire `readOperatorContext` + Flow phase UI
3. Ingest: call `assertContextHasNoFlow` on EventCandidate metadata write
4. Rename `LodgingAgentContainer` → `LodgingAgentScope` (single PR)
5. Deprecate `contextEventId` in new hook signatures

**Rule:** UX simplification > terminology variety. No cosmetic renames without responsibility change.
