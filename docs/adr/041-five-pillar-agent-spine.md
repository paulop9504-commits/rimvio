# ADR-041: Five-Pillar Agent Spine (Cursor isomorphism)

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/rimvio-agent-spine.ts`  
**Related:** ADR-021 · ADR-038 · ADR-039 · ADR-040 · Article 0

## One sentence

> **Cursor is strong because five systems are wired — not because of prompts.** Rimvio mirrors the same architecture with Reality nouns.

## Isomorphism

| Cursor | Rimvio |
|--------|--------|
| Agent | Rimvio Agent (Autonomous Context Agent) |
| Project State | **Context Graph** |
| Execution History | **Agent Execution State** + session |
| Tool Access | Tools / `@` / Workspace patches |
| Verification Loop | **Self Repair Loop** (verify → repair → recompute) |

Durable Reality ledger:

| Cursor analog | Rimvio |
|---------------|--------|
| git / commit log | **Commit Ledger** (Field Reality Commit) |
| terminal / diff trail | **Reality Timeline** (workstream events) |

## The five that must stay connected

```
Context Graph
+
Agent Execution State
+
Reality Timeline
+
Commit Ledger
+
Self Repair Loop
```

Detach any one → chatbot regression (prompt + chat history only).

## Ownership (do not fork)

| Pillar | Owner package |
|--------|----------------|
| Context Graph | EventCandidate + work residue + stay segments / Workspace |
| Agent Execution State | `build-agent-execution-state` · session · Work State |
| Reality Timeline | workstream Event Log projection |
| Commit Ledger | Reality Queue Commit + `promoteRealityCommitToContextGraph` |
| Self Repair Loop | `agent-execution-loop` · heal session · verify gates |

## Product law

Prompts are subordinate. The spine is the product.

## PR reject

- Parallel “agent memory” beside Work State / workstream  
- Progress only in chat bubbles  
- Commit without densifying Context Graph  
- Tool dumps without Execution State update  
- Asking users before Self Repair when auto-fix is possible
