# ADR-048: Cursor Agent Policy on Workspace

**Status:** accepted 2026-08  
**Wire:** `lib/agent-policy/` · `docs/RIMVIO_CURSOR_AGENT_POLICY.md`  
**Related:** ADR-013 · ADR-021 · ADR-022 · ADR-025 · Article 0

## One sentence

> **Workspace Agent behaves like Cursor: clear intent replaces candidates; soft intent refines the current set; dangerous acts wait for Commit.**

## Decision

| Signal | Mode | Action |
|--------|------|--------|
| Clear constraint / re-search | `replace` | Re-scout · `replace_candidates` (keep Context) |
| Soft rank / filter in-set | `refine` | Filter · sort · keep top N (no full re-fetch required) |
| Reserve / pay | Field Commit | Never auto Reality Commit |

## Dual surface (locked)

Same facts, two projectors — never invent twice:

- **Callout** — object-anchored 1–3 lines (SSOT projection)
- **LLM reply** — short work-log summary (not SSOT)

## Full constitution

Laws **1–25** (Reality OS Agent Operating Constitution):  
[`docs/RIMVIO_AGENT_OPERATING_CONSTITUTION.md`](../RIMVIO_AGENT_OPERATING_CONSTITUTION.md) · ADR-049

## PR reject

- Soft phrase (“더 싸게”) forcing full inventory replace when filter suffices  
- Clear location (“난바 쪽으로”) only re-ranking old pins without re-scout  
- LLM essay as the only record of what changed  
- Auto Reality Commit from Workspace chat
