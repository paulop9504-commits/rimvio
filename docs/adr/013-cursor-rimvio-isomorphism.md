# ADR-013: Cursor ↔ Rimvio OS Isomorphism

**Status:** accepted 2026-07  
**Wire:** `lib/context-builder/` · `lib/rule-engine/` · `lib/action-planner/` · `lib/graph-command/` · `lib/tool-registry/` · `lib/agent-runtime/` · `lib/reality-commit/`  
**Related:** ADR-011 Graph Command · ADR-012 Rule Engine Constitution

## Thesis

Cursor is **not** “just GPT.” LLM is the brain; Cursor’s product power is:

```
Context Builder + Planner + Tools + Edit Engine + Approval
```

Rimvio maps the same stack onto **Reality / Context Graph** instead of a codebase.

| Cursor | Rimvio |
|--------|--------|
| Project files / git / LSP | Session graph · pins · folders · Inbox |
| Intent: “fix bug” | Intent Grammar → Action IR |
| Planner: files to touch | Action Planner steps |
| Context Builder: relevant files only | **Context Builder: relevant nodes only** |
| LLM inference | LLM only when `allowLlmReasoning` |
| Edit Engine → Diff | Graph Engine → session graph diff |
| User accept Diff | Field **Commit** (Article 0) |
| Delete function / rename | Delete Node / Pin / Move Context / Reserve |

## Law

> **Cursor edits Code. Rimvio edits Reality Graph.**  
> Neither dumps the whole world into the LLM.

## Engine build order (locked)

1. **Context Builder** — pack only what this turn needs  
2. **Intent Parser** — NL → Action / Intent family  
3. **Planner** — ordered steps  
4. **Tool Router** — maps / booking / graph / payment  
5. **Graph Engine** — mutate session graph  
6. **Agent Runtime** — prepare domain work  
7. **Commit Engine** — human approve → Reality

## Runtime spine SSOT (four axes)

**Canonical:** ADR-021 · `lib/context-run/cursor-os-spine.ts`

| Axis | Rimvio |
|------|--------|
| Intent → ToolId | `resolve-tool-id` |
| Tool → Graph Diff | `stamp-search-tool-results-to-diff` · RO markers |
| Stage order | `tool_router` → `graph_command_ir` → `graph_engine` |
| Approval | Field Commit vs soft confirm chips |

## Domain difference (why Commit is heavier)

Cursor ≈ one domain (code).  
Rimvio spans travel · commerce · calendar · payment · external APIs.  
Therefore **Tool Router + Agent Runtime + Commit** are stricter than Cursor’s Diff accept.

## Reject in review

- Send full session graph / all inventory to LLM by default  
- Skip Context Builder and jump to free-NL chat  
- Auto Reality mutation without Commit (Cursor-style “apply without accept” for Reserve/Purchase)
- Bypass ADR-021 spine (chat dump Search results · inverted Search stages · soft edits opening Field)
