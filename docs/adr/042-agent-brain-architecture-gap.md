# ADR-042: Architecture gap — Agent Brain on Context Graph

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/agent-brain.ts` · `verification-agent.ts` · `compile-intent-to-goal-state.ts`  
**Related:** ADR-023 · ADR-038–041 · Globe AI / Context AI split (ADR-031)

## Honest scorecard

| Layer | Score | Note |
|-------|-------|------|
| Context structure | ★★★★★ | Blueprint / Work State / Graph |
| Reality model | ★★★★★ | Commit · epistemic levels |
| Globe concept | ★★★★★ | Capsule · Forest · Three Floors |
| Intent understanding | ★★★★☆ | Compiler IR exists; goal_state mapping thin |
| Execution management | ★★★☆☆ → ★★★★ | Execution State Manager shipped; must stay always-on |
| Self Repair | ★★☆☆☆ → ★★★ | Loop + Verification Agent seed |
| Verification | ★★☆☆☆ → ★★★ | Feasibility checks before Commit |
| Personal Memory | ★★★☆☆ | Rollup prefs; not a full profile OS yet |

## Current architecture (keep)

```
User → NL → Globe AI (Architect) → Context Blueprint
         → Context AI (Operator) → Graph / Domain / Execution
         → Reality Commit → Globe Projection
```

## Gap → priority (Cursor-class)

1. **Agent Execution State Manager** — always-alive brain on Context Graph (not request→result)
2. **Verification + Repair Loop** — Generate → Verify → Repair → Commit
3. **Intent Compiler** — utterance → intent → conditions → constraints → **goal_state** (never jump to execute)

## Agent Brain (one sentence)

> **Context Graph is the project; Agent Brain tracks the goal, verifies Reality, and repairs before Commit.**

```
Context Graph
      ↑
Agent Brain = Execution State + Task Graph + Verification + Repair + Intent→goal_state
```

## PR reject

- Treating Execution State as optional UX chrome  
- Commit without verify when feasibility inputs exist  
- NL → tool dump skipping goal_state / Task Graph  
- Parallel “Ultimate Agent” stack beside workstream spine
