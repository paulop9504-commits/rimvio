# ADR-046: Agent Behavior Quality — Supervisor · World · Opportunity · Reflection

**Status:** accepted 2026-07  
**Wire:** `goal-supervisor.ts` · `world-state.ts` · `opportunity-detector.ts` · `agent-reflection.ts`  
**Related:** ADR-045 · Article 0

## One sentence

> Architecture is settled. Raise **behavior quality**: track Goal forever, watch the World, surface Opportunities, Reflect after Commit.

## Four additions (inside one Runtime — not new packages)

| Role | Job |
|------|-----|
| **Goal Supervisor** | Why this %? What raises it next? Is Goal done? |
| **World State** | Weather · FX · transit · events · booking availability |
| **Opportunity Detector** | USJ discount · flight drop → new Task (user didn't ask) |
| **Reflection** | Post-Commit 3–5 lines: worked · failed · improve |

## Runtime roles (updated)

```
Observer → Supervisor → Judge → Planner → Coordinator → Executor
→ Verifier → Repairer → Committer → Historian
```

**Strategist → Coordinator** — Planner plans; Coordinator orchestrates Registry capabilities (Booking · Search · Vision · Calendar).

## Behavior loop (product feel)

```
"오사카 여행 알아서 준비해"
  → Goal track
  → World observe
  → Opportunities invent tasks
  → Verify before Commit
  → Reflect & learn
```

Competitive edge = **Runtime operating quality**, not LLM cleverness.

## PR reject

- New Runtime for opportunities / weather / reflection  
- Skipping Goal Supervisor on multi-slot trips  
- Commit without path to Reflection  
- Renaming Coordinator back to a parallel “strategy agent”
