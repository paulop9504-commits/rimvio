# ADR-044: Agent Judgment Chain + Reality Cost Estimator

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/agent-judgment-chain.ts` · `spine-ingress-helpers.ts`  
**Related:** ADR-040–043 · Article 0 · Cursor OS Spine

## One sentence

> **Rimvio does not win with one clever algorithm.** It chains small judges — Complexity → Scope → Reality Cost → Strategy — then runs the same Agent Spine at the right depth.

## Cursor analogy (locked)

Cursor is not one mega-model loop. It is:

```
Input → Complexity → Scope → Planner → Strategy → Execute → Verify → Repair
```

Rimvio maps 1:1 onto Context OS:

```
User Intent
  → Intent Compiler (Goal State)
  → Complexity Analyzer
  → Scope Analyzer
  → Reality Cost Estimator  ★ Rimvio+
  → Strategy Selector
  → Execution (Spine)
  → Verification → Repair
  → Commit
```

## Strategies (same Spine — different depth)

| Strategy | When | Behavior |
|----------|------|----------|
| **Quick** | Easy · low Reality Cost | Skip full Trip Planner → search/patch |
| **Planning** | Medium | Build Task Graph → execute |
| **Multi** | Hard · high steps/risk | Planner → Execution → Verification → Repair → Commit |

These are **workflow modes**, not parallel Agent products. PR reject: `QuickAgent` as a second OS.

## Reality Cost Estimator (beyond difficulty)

Scores (0–10) + gates:

| Axis | Meaning |
|------|---------|
| `timeCost` | How long / how many steps |
| `dataImpact` | How many Context / Reality surfaces change |
| `failureRisk` | Safe to auto-run? |
| `userApprovalNeed` | none · soft_chip · field_commit · **final_commit_only** |
| `verificationRequired` | Must run Verification Agent before Commit |
| `estimatedSteps` | Planner budget |

Example:

```
오사카 여행 만들어줘
Complexity: hard (8.7/10)
Impact: Medium–High
Estimated Steps: 12
Verification: Yes
User Approval: Final Commit Only
Strategy: Multi-Agent Workflow
```

vs

```
숙소만 찾아줘
Complexity: easy (2.2/10)
Strategy: Quick Agent
```

## PR reject

- One monolithic “super agent” prompt that skips judges  
- Parallel agent generations outside Spine  
- Hard trips without Verification when `verificationRequired`  
- Booking / Reality mutate with `userApprovalNeed: none`  
- Inventing separate Quick/Planning/Repair product surfaces
