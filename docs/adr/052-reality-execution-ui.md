# ADR-052: Reality Execution UI (Globe Agent surface)

**Status:** proposed 2026-08 · UI SSOT (not a second runtime)  
**Wire (today):** `lib/context-run/execution-feed-*` · `lib/context-run/agent-activity-transcript.ts` · `lib/context-run/agent-product-pipeline.ts` · `lib/context-run/sync-agent-activity-trail.ts` · `components/globe/chat/cursor-agent-activity-trail.tsx` · `components/context-workspace/workspace-agent-activity-panel.tsx` · `components/globe/execution-feed/`  
**Related:** ADR-013 · ADR-021 · ADR-022 · ADR-037 · ADR-039 · ADR-045 · ADR-050 · ADR-051 · Article 0

## One sentence

> **Cursor shows code execution; Rimvio shows Reality Execution — the live pipeline from Intent → Commit, not a result dump.**

Globe chat must feel like an **Execution UI** (what AI is doing now), not a carousel of finished hotels first.

## Problem (current UX)

Home Agent sheet today skews **result-first**:

- Header: `Agent 100% 작업` +「작업 접기」
- Bubble: `상태 정리 중…` (pipeline tail label, not live thought)
- Horizontal candidate cards (APA 난바…) appear before / instead of a clear execution tape
- Reply: `숙소 후보 24곳 준비했어요 · 작업장에서 확인`

Users see **outputs**, not **progress of Reality work**. Cursor’s strength is the opposite: Activity Trail + nested Auto + Waiting.

## Doctrine

| Layer | Owns | Must not |
|-------|------|----------|
| **Agent Runtime** (ADR-050) | Stages · Patch · Prepare | Open Field Commit for soft edits |
| **Reality Commit** (ADR-037 / Article 0) | Reality mutation | Happen from UI alone |
| **Reality Execution UI** (this ADR) | Projection of stages + NL log + streaming result cards | Become SSOT · second orchestrator · chat essay store |

Chat remains **work log + Execution surface**. Workspace remains SSOT. Capsules on Globe after snapshot / Commit.

### Cursor → Rimvio (execution metaphor)

| Cursor | Rimvio Reality Execution |
|--------|---------------------------|
| Ran N commands | Stage counters · tool ticks |
| Activity Trail · Auto | Product pipeline trail · soft 「펼치기」 |
| Planning next moves | NL live log line |
| Waiting for subagent | **Workers** lane (Search / Hotel / Route / …) |
| Diff / files | Workspace Patch · candidate cards · map projection |
| (none) | **Execution graph nodes** Intent→…→Commit lit live |

## Canonical pipeline (product tape)

Align UI labels to ADR-050 stages (do not invent a parallel runtime):

```
Intent
  → Context Analysis
  → Knowledge Gathering
  → Candidate Discovery
  → Decision & Ranking
  → Workspace Patch
  → Reality Projection
  → User Approval (when required)
  → Reality Commit
```

Wire map:

| UI stage (user) | `AGENT_PRODUCT_PIPELINE_STAGES` |
|-----------------|----------------------------------|
| Understand Intent | `intent` · `context_resolution` |
| Find / Knowledge | `planner` |
| Search / Discover | `object_discovery` · `object_enrichment` |
| Rank / Compare | `candidate_evaluation` |
| Patch Workspace | `workspace_patch` |
| Project | `projection` · `agent_status` |
| Prepare / Reserve | `prepare` |
| Commit | `commit` |

## Globe shell layout (locked composition)

One composition while Agent Working — **not** a dashboard of 10 equal panels. Regions collapse when idle.

```
┌ Agent ● Working · Building {Context} · ████░░ pct ┐
├ Execution Trail (✓ ● ○ stages)                     ┤
├ Working on · Entity (current touch target)         ┤  optional until Discovery
├ Workers (✓ Search ● Hotel ○ Route …)               ┤  when multi-worker
├ Live Log (timestamp + NL lines, append-only)       ┤
├ Results (streaming cards — appear as found)        ┤
└ soft CTA 「펼치기」 / Commit when Article 0 requires ┘
```

**Always One New Concept** (ADR-022): first paint teaches **Trail + Live Log**; Workers / Graph / Timeline unfold after first successful Discovery turn or via expand.

### Color grammar (Light Globe — hierarchy like Cursor)

| State | Tone |
|-------|------|
| pending | muted gray |
| running | blue (accent) |
| done | green check |
| failed | red |
| waiting_user / API | muted pulse |

No dark-IDE clone on Globe home (Apple light chrome).

## Ten capabilities → gap map

| # | Capability | Have today | Gap |
|---|------------|------------|-----|
| 1 | Top stage + % | Partial: Workspace status / “Agent 100%” copy; pipeline % not driven by stage weight | Drive header from `readLastAgentProductTurn` + pct helper; replace misleading 100% while mid-run |
| 2 | Append-only Execution Stream | `agent-activity-transcript` + feed steps; chat often jumps to final status | Stream NL lines into Globe chat / Execution shell live (not only final bubble) |
| 3 | Expandable detail log | Feed artifact checklist/tabs; Cursor nest UI started (`cursor-agent-activity-trail`) | Per-step ▶ expand sources (Maps / Booking / …) |
| 4 | Agent Trail ✓●○ | Product stages + Workspace activity panel; Globe light Cursor trail MVP | Unify **one** Trail model for Globe shell + Workspace (same stage SSOT) |
| 5 | Working on / Entity | Projection policy `activeContextEventId`; node select in Workspace | Explicit “Working on Osaka Trip · APA Hotel” chip in shell |
| 6 | Workers / subagents | “Waiting for agent” copy only | Worker registry projection (Search/Hotel/Route/Reservation) — UI only; no fake agents without tool ownership |
| 7 | Streaming result cards | Cards dump after batch (screenshot) | Emit card-on-find during Discovery (append Result region; don’t replace Trail) |
| 8 | Timestamp Timeline | Feed `createdAt` on items | Live Log with `HH:mm` lines + debug retention |
| 9 | Natural language logs | Some `STATUS_KO` + status work-log | Ban infra jargon in user lines; discard reasons (“price too high”) |
| 10 | Work / execution graph glow | Reality / Execution Graph exists as OS data | Compact vertical node strip in shell — light **current** node; not Globe 3D editor |

## SSOT rules

1. **Stages** → `agent-product-pipeline.ts` only.  
2. **Event tape** → `agent-activity-transcript.ts` (+ optional feed mirror via `sync-agent-activity-trail.ts`).  
3. **Projection store** → Execution Feed reducer for pills/artifact; do not parallel “execution UI store”.  
4. **Results** → Workspace nodes / Graph IR remain truth; cards are projections.  
5. **Commit** → never auto from Trail UI (Article 0). Soft open Workspace via 「펼치기」 (ADR-022 Preview).

## PR reject

- Result carousel as **sole** first paint while Agent is running  
- New LLM essay as Execution SSOT  
- Second stage enum diverging from ADR-050  
- Dark Cursor clone overriding Globe light IA  
- Fake Workers without owned tools  
- Auto Reality Commit from “Done” animation  
- Treating Globe 3D as live Reality street editor (ADR-022)

## Build order (when implementing)

1. **Shell header + Trail + Live Log** bound to existing pipeline/transcript (MVP)  
2. Streaming Results under log (card-on-find) — stop result-only first paint  
3. Working-on / Entity chip  
4. Expandable step detail (#3)  
5. Workers lane (honest tool ownership)  
6. Compact graph strip (#10)  
7. Timeline debug retention (#8)

## Acceptance (UX)

While Discovery runs, user can answer without scrolling essays:

1. What stage is live?  
2. What just happened (last NL line)?  
3. What is being touched (Context / Entity)?  
4. What appeared so far (streaming cards)?  
5. What is next (○ Trail ahead)?  

“상태 정리 중…” alone is **reject** as the only running signal.

## Non-goals (this ADR)

- Replacing Workspace six regions (ADR-026)  
- Field Commit redesign  
- Silent Ghost / truth-log patterns
