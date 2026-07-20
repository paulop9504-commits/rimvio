# RIMVIO Core Architecture — Cursor for Reality

**Status:** canonical 2026-07  
**Code SSOT:** `lib/context-builder/` · `lib/rule-engine/` · `lib/graph-command/` · `lib/action-planner/` · `lib/tool-registry/` · `lib/agent-runtime/` · `lib/booking-runtime/` · `lib/reality-commit/` · `lib/reality-object/` · `lib/context-run/natural-language-pipeline.ts`  
**ADRs:** 011 Graph Command · 012 Rule Engine Constitution · 013 Cursor Isomorphism · 014 Reality Object Engine

## Core philosophy

> **Cursor가 코드를 편집한다면, RIMVIO는 Reality Graph를 편집한다.**

Cursor understands and edits a codebase. Rimvio understands the user’s **Context** and edits the **graph + real actions**. The LLM is not the product — it is a **reasoning co-processor**. The system is operated by **Rule + Context + Graph + Tools**.

## Operating Constitution (priority — never invert)

```
Context First
    ↓
Reality First
    ↓
Graph First
    ↓
Action First
    ↓
Reason Later
```

- **Context First** — understand current project / trip / task context.
- **Reality First** — real reservations, payments, schedule state always outrank drafts.
- **Graph First** — all state is the ontology graph.
- **Action First** — executable Action over text reply.
- **Reason Later** — call the LLM only when analysis / prediction is needed.

Code: `ORCHESTRATION_PRIORITY` in `lib/rule-engine/constitution.ts`.

## Cursor ↔ Rimvio isomorphism

| Cursor | Rimvio |
|--------|--------|
| Context Builder (relevant files) | Context Builder (relevant nodes) — `lib/context-builder` |
| Planner | Action Planner — `lib/action-planner` |
| grep / LSP / Terminal | Tool Router — `lib/rule-engine/route-tool-family` + `lib/tool-registry` |
| File Diff | Session Graph change — `lib/graph-command` |
| Accept Changes | Reality Commit — `lib/reality-commit` + Field 결재함 |
| Codebase | Reality Graph — session graph + truth |

## Natural Language Pipeline

```
Natural Language
  → Context Builder      (lib/context-builder)
  → Rule Constitution    (lib/rule-engine)
  → Entity Resolver      (lib/graph-command/resolve-graph-entity)
  → Intent Parser        (classify-intent-family · parse-graph-commands)
  → Action Planner       (lib/action-planner)
  → Tool Router          (route-tool-family · lib/tool-registry)
  → Graph Command IR     (lib/graph-command/types)
  → Graph Engine         (apply-graph-commands)
  → Agent Runtime        (lib/agent-runtime · lib/booking-runtime)
  → Reality Commit       (lib/reality-commit · commit-reality-queue-client)
  → Reality Graph        (truth + session graph)
```

Stage SSOT: `NL_PIPELINE_MANIFEST` in `lib/context-run/natural-language-pipeline.ts`.  
Runtime entry: `tryRunContextNlAction` / `tryRunContextNlActionAsync` (`lib/action-planner`).  
**LLM runs only at reasoning-eligible stages** (`llmEligibleStages()`), never as the default answer.

## Context Builder

The LLM never sees the whole graph. Context Builder packs only what the turn needs.

Packing signals: current **selection**, **pinned** nodes, recent Action, **Intent-related** nodes, active context, recent turn. Cap ≈ **10–12** nodes. Last pack is remembered → deictic references (「여기 · 이거 · 저기」) resolve via `resolveDeicticFromLastPack`.

## Rule Constitution

Rule Engine runs **before** the LLM. Rules (`RULE_ENGINE_MANIFEST`):

- Context First · Resolve Entity before Reasoning
- Prefer Action over Text · Prefer Tool over Hallucination
- Ask at most one clarification (`resolveClarifyLess`)
- Dangerous Action requires Commit (`COMMIT_REQUIRED_INTENTS`)
- Every Action updates the Graph · Every Action is reversible

## Intent Grammar

`Search · Pin · Compare · Move · Delete · Group · Ungroup · Note · Reserve · Purchase · Share · Navigate · Highlight · Filter · Analyze · Predict · Simulate · Create · Calendar` (`INTENT_FAMILIES`).

## Action Planner

Planner does not execute immediately. For 「A랑 B 비교해서 좋은 곳 예약해」:

1. Entity resolve → 2. lookup → 3. compare → 4. apply preference → 5. reservable check → 6. reserve prepare → 7. Commit request. Stops at `wait_commit`.

## Tool Router

The LLM never calls APIs directly. Router maps Intent → Tool family: `maps · booking · flight · hotel · restaurant · calendar · payment · graph · ranking`. Adding a tool does not change the Planner.

## Graph Engine

Only engine that mutates the Reality Graph: `pin · delete · create · edge · compare · move_context · group · filter · highlight · style · note · reserve_prep`. Every Action is recorded as an Event.

## Reality Object Engine

「맥락에 고정」creates a **Reality Object** (`lib/reality-object`), not a bookmark. Objects share one shape (Visual · Ontology · Location · Relations · Execution · Timeline). Persist on the context EventCandidate; Globe markers prefer `coverImageUrl`. World-geo `lib/reality-graph` (`geo:*`) is a separate admin hierarchy — not the user object store. See ADR-014.

**Visual Projection Engine** (`lib/visual-projection`, ADR-015) picks the most representative cover (Recognition · Aesthetic · Projection · Representativeness), applies zoom LOD (glyph → label → image), Object Halo by type, and hierarchical context projection (active project foreground only).

**Context Bloom** (ADR-016) — select an object → scale + glow → related objects bloom in sequence → brief ranked arcs (top 3–5) that fade. Attention over permanent graph lines. Segmentation is selective, never mandatory.

## Agent Runtime

Changes the outside world (booking, payment, calendar, email, taxi). Always runs **after** Graph Engine, and only **prepares** until Commit. Providers: `google_maps_reserve` (handoff), `liteapi_booking` (prebook), `demo_stub`.

## Reality Commit

Reality-changing Actions (`Delete · Reserve · Purchase · Share`) require:

```
Preview → Human Approval → Commit → Execution
```

Gate: `assertHumanRealityCommit`. One-tap CEO Sign promotes pending → ready (`promotePendingPreparedOpsForCeoSign`).

## Role separation (one line)

> **LLM reasons. Rule Engine decides. Planner plans. Graph Engine changes state. Agent executes Reality. Commit guarantees human approval.**

## Harder than Cursor

Cursor = one domain (code). Rimvio spans travel · shopping · schedule · real estate · commerce on one Context OS. Therefore **Tool Router · Agent Runtime · Reality Commit** carry the real-world connection and are stricter than Cursor’s Diff accept.

## Verify

```
npm run test:context-builder
npm run test:rule-engine
npm run test:osaka-demo-path
npm run test:graph-command-os
npm run test:action-planner
npm run test:booking-live-wiring
```
