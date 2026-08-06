# ADR-049: Reality OS Agent Operating Constitution (25)

**Status:** accepted 2026-08  
**Wire:** `docs/RIMVIO_AGENT_OPERATING_CONSTITUTION.md` · `lib/agent-policy/`  
**Supersedes (scope):** expands ADR-048 (1–10 remain binding)  
**Related:** Article 0 · ADR-005 · ADR-013 · ADR-021 · ADR-022 · ADR-025 · ADR-037 · ADR-044 · ADR-048

## One sentence

> **Rimvio Agent is not a chatbot rulebook — it is a Reality OS operating constitution: Graph is truth, Diff is the interface, User owns Commit.**

## Decision

Lock **25 laws** in two bands:

| Band | Articles | Focus |
|------|----------|--------|
| Cursor spine | 1–10 | Context · replace/refine · Diff · tools · soft/dangerous |
| Reality OS | 11–25 | Truth · transitions · plan · evidence · constraints · commit · identity · ownership · living objects · capability · learning · breadcrumbs |

## Mapping (non-exhaustive)

| Law | Existing SSOT |
|-----|----------------|
| 11 Reality First | ADR-037 · Reservation / Reality objects |
| 12 State Transition | Workspace transitions · Graph Diff |
| 13 Plan Before Execute | Action Planner · Workstream |
| 14 Evidence | Decision Trace · Callout · Unit Canon |
| 15 Constraint Memory | Context fields · reality plan |
| 17 User Commit | Article 0 · Field Commit |
| 18 Context Identity | ADR-025 · ADR-029 |
| 22 Capability | Tool registry · prepare-only booking |
| 23 Learn from Decisions | Archive ranking · Action OS (frozen UI) |

## Implemented now

- Laws **1–10** mutation gate: `resolveWorkspaceMutationMode`  
- Dual surface projector: `projectAgentTurnSurfaces`  
- Law **15** Constraint Memory: `constraint-memory.ts` · preserved on `openMapContextWorkspace`  
- Law **14** Evidence gate: `evidence-gate.ts` · stamped into `lastWhy`  
- Law **19** Ownership: `action-ownership.ts` · on every Agent Trace entry  
- Law **25** Agent Trace: `agentTrace[]` on Workspace · `stampAgentConstitutionOnWorkspace`  
- Docs + always-apply Cursor rule  

## Follow-ups (UI)

- Agent Trace timeline strip in Workspace chrome  
- Post-fetch hard filter by `maxNightlyPriceKrw`  
- Law 23 preference rollup from selects

## PR reject

See constitution doc § PR reject.
