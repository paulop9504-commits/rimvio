# ADR-039: Reality IDE — Agent Execution State UI

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/build-agent-execution-state.ts` · `agent-execution-session.ts` · `WorkspaceAgentStatusPanel`  
**Related:** ADR-036 · ADR-037 · ADR-038 · ADR-021

## One sentence

> **Rimvio is a Reality IDE** — show how Reality is changing, what Context is being built, and what the next Reality Action is. Users supervise and approve; they do not re-explain.

## Cursor ↔ Rimvio

| Cursor IDE | Reality IDE |
|------------|-------------|
| What the agent is editing | How Reality is changing |
| How far the task got | What Context is being built |
| What runs next | Next Reality Action |
| Terminal / commit log | Reality Timeline |

## Separated UI (not chat dump)

| Surface | Shows |
|---------|--------|
| Conversation | User ↔ AI turns only |
| Agent Status Panel | Current Context · status · progress bar · completed / running / next |
| Reality Timeline | Time-ordered residue (selection → commit → densify) |
| Prompt · Continue | Enqueue next Action from Work State |

## Execution State Manager

```
current_task · context_id · completed_steps · running_step
· next_actions · commit_status · error_state · recovery_plan
```

Durable facts stay in Workstream + Context Work State (ADR-038).  
Ephemeral run steps live in `agent-execution-session` (like Cursor’s live terminal for *this* turn).

## Self-healing loop

```
Context run → problem → analyze → auto-fix → recompute → verify → Commit
```

Healing steps appear in the Status Panel / Timeline (`healed` / recovery_plan). Do not bury them in chat essays.

## PR reject

- Putting the only progress log inside chat bubbles  
- Parallel agent-execution package that forks Work State / workstream  
- Teaching users to restate the whole trip when Execution State exists
