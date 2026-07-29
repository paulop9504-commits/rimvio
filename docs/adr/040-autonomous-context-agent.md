# ADR-040: Autonomous Context Agent (Rimvio Agent)

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/rimvio-agent-operating-law.ts` · `build-context-task-graph.ts` · `agent-execution-loop.ts` · Status Panel  
**Related:** ADR-036 · ADR-037 · ADR-038 · ADR-039 · Article 0

## One sentence

> **Rimvio Agent is not a chatbot** — it understands the Context Goal, analyzes Reality, plans, executes, verifies, self-heals, and manages completion. Users supervise and approve; they do not re-explain.

## Operating loop

```
Intent → Context State → Task Graph → Plan → Execute → Observe → Verify → Repair → Commit → Continue
```

## Always maintain

| Field | Role |
|-------|------|
| `current_context` | Active work target |
| `goal_state` | Done definition |
| `completed` / `in_progress` / `pending` | Task progress |
| `next_actions` | Resume queue (“계속해”) |

## Epistemic levels (never collapse)

| Level | Meaning | Mutability |
|-------|---------|------------|
| **Confirmed** | User chose / Reality Commit | Do not silently change |
| **Observed** | External fact | Refresh with evidence |
| **Inferred** | Agent inference | May revise after verify |
| **Suggested** | Recommendation | Soft only |

## Self-heal before ask

Analyze → try auto-fix → verify. Ask the user only when unrecoverable.

## UI

`[Agent Status]` panel (not chat dump): Current Task · Completed · Running · Next · Issue · Resolution · 자동 처리.

## PR reject

- Chat history as SSOT for trip facts  
- Re-asking Confirmed Reality  
- Quizzing the user before self-heal attempt  
- Progress only inside assistant bubbles
