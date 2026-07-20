# ADR-012: Rule Engine + Prompt Constitution (Orchestration > Prompt)

**Status:** accepted 2026-07  
**Wire:** `lib/rule-engine/` · consumes `lib/graph-command/` · `lib/action-planner/` · `lib/tool-registry/` · `lib/reality-commit/`  
**Supersedes (priority):** free-NL → LLM chat as default answer path when a Rule fires.

## Context

Teams often chase GPT-quality NL by lengthening system prompts. That fails. GPT-class *feel* comes from **middle engines**: structure meaning before the LLM, manage execution after it.

Rimvio stack (target):

```
Natural language
  → Context Engine
  → Intent Engine
  → Entity Resolver
  → Planner
  → Tool Router
  → LLM (only when reasoning is required)
  → Graph Engine
  → Agent Runtime
  → (human) Reality Commit
```

LLM sits in the middle for **inference only**. Rules own Action / Entity / Context / Commit.

## Decision — Priority stack (above any prompt)

**Context First → Graph First → Action First → Reason Later**

| # | Rule | Behavior |
|---|------|----------|
| R1 | Action First | Prefer Action IR (`PinNode`, …) over text reply |
| R2 | Entity First | Resolve “이 호텔” / APA → node before reasoning |
| R3 | Context First | “여기로 옮겨” uses selection / active context |
| R4 | Clarify Less | At most **one** clarification; if single candidate → execute |
| R5 | Tools First | Prefer search / reserve / maps / calendar over prose |
| R6 | Graph Mutates | Compare → Compare node; delete → Delete; hide → Visibility |
| R7 | Commit Gate | **Field Commit** = Reserve / Purchase / prepared booking ops only. **Soft confirm chips** = Revise / Filter / Pin / Delete (session graph · condition edits). Share prep is graph-only until Reality egress. |

## Prompt Constitution (system prompt is subordinate)

1. Always understand Context before answering.  
2. Always resolve entities before reasoning.  
3. Never answer if an Action can be executed.  
4. Prefer editing the Graph over generating text.  
5. Ask at most one clarification.  
6. Never modify Reality without Commit.  
7. Use tools whenever possible.  
8. Preserve Context continuity.  
9. Every Action updates the session Ontology Graph (internal; L1 copy never says “Ontology”).  
10. Every execution is reversible where product policy allows (undo / hold / reject).

## Intent Grammar (first classification)

`Search | Compare | Move | Pin | Delete | Create | Reserve | Purchase | Filter | Share | Navigate | Predict | Simulate | Analyze | Group | Ungroup | Highlight | Note | Calendar`

Tool Router maps Intent → Tool family (`maps` · `booking` · `graph` · `payment` · …).

## Memory Rule (later slice)

Preferences (“항상 창가”) persist and bias next Reserve ranking — not free chat memory dumps.

## Consequences

- Composer / Context Agent **must** call Rule Engine evaluation (or an equivalent gate that encodes these rules) before free-NL LLM.
- PR reject: “just ask the LLM” when Action/Entity/Context can resolve.
- PR reject: multi-question clarification loops.
- PR reject: Reality mutation without Field Commit.
- PR reject: condition edits (Filter / Pin / Delete / stay Revise) opening Field Commit — use soft confirm chips.
- PR reject: Delete / Share-prep treated as Reality-dangerous Commit (session graph only).

## Relationship to ADR-011

ADR-011 ships Graph Command IR + Planner + Tools.  
ADR-012 is the **law above those engines** — same stack, explicit Rule Engine SSOT + Clarify Less + Commit taxonomy.
