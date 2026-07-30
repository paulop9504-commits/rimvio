# ADR-043: Goal State top SSOT + Agent Spine convergence

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/context-goal-state.ts` · `agent-spine-law.ts` · `spine-ingress-helpers.ts` · `preference-graph.ts`  
**Ingress (converged):**  
`runOrchestratorPipeline` (action-chat) · `runNaturalLanguagePipeline*` (context-run) · `planRimvioEngineTurn` (engine) · Workspace prompt · portal compose · Reality Commit
**Related:** ADR-038–042 · NL_PIPELINE_STAGES · Article 0

## One sentence

> **Goal State sits above Context Graph.** All Intent paths converge on one Agent Spine — do not add parallel agent generations.

## Stack order (locked)

```
Goal State
  ↓
Context Graph
  ↓
Execution State
  ↓
Verification → Repair
  ↓
Reality Queue
  ↓
Commit
```

Progress % is **Goal completion**, not chat turn count.

## Spine convergence (P0 product law)

Parallel generations that must **ingress through the Spine**, not bypass it:

| Legacy path | Must become |
|-------------|-------------|
| `action-chat` | Spine ingress → same Execution State |
| `context-run` | Spine ingress → same Verification gate |
| `workstream` | Spine owner (Work State · Timeline · Goal) |
| `lib/engine` | Domain packages **behind** Spine tools, not a second agent |

```
Every Intent → Agent Spine → Execution State → Verification → Reality Queue → Commit
```

## Pipeline keep (strength)

```
Builder → Rules → Entity → Intent → Plan → Tools → Graph → Agent → Commit
```

This is Reality State Machine, not Input→LLM→Output.

## Five priorities (no new feature sprawl)

1. **Goal State** — top SSOT per Context  
2. **Spine unify** — converge action-chat / context-run / workstream / engine  
3. **Verification → Repair → Commit** — mandatory before Reality mutate  
4. **Preference Graph** — long-term walk / quiet / no-wait / transit memory  
5. **One Status/Timeline** — same Agent Status on every surface  

## PR reject

- New Agent D next to Spine  
- Progress % not derived from Goal State  
- Commit without Verification stage when feasibility inputs exist  
- Preference only in chat history  
- Different Status UI per surface for the same Context
