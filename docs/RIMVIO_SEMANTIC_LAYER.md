# Rimvio Semantic Layer (Meaning Projection)

> **Status:** locked 2026-06  
> **Rule:** Read-only SPO projection on EventCandidate — never a second SSOT.  
> **UI law:** Surfaces show **one** `semanticMainHint` — not the graph.

---

## Layer placement

```text
EventCandidate (SSOT)
    → projectSemanticTriples()     [lib/semantic/]
        → PersonalReadPacket.meaning.semanticTriples
        → PersonalReadPacket.action.semanticMainHint
            → MAIN rank boost (deterministic)
            → serializePacketForLlm (Phase 3 assist only)
```

Distinct from **UI ontology** (`lib/design/rimvio-ontology.ts` — Simple is Best surfaces).

---

## Closed vocabulary

### Classes (5)

| Class | Rimvio anchor |
|-------|----------------|
| `experience` | EventCandidate bundle |
| `context` | Active place/time scope |
| `resource_hub` | Context hub service (`flight`, `lodging`, …) |
| `action` | `@` registry / hub handoff |
| `entity` | Person · place nodes |

### Predicates (8)

| Predicate | Example |
|-----------|---------|
| `is_a` | experience → travel context |
| `occurs_in` | meal experience → place:홍대 |
| `part_of` | person → experience |
| `has_intent` | 제주 trip → action:schedule |
| `requires_hub` | travel → hub:flight |
| `precedes` | hub:flight (done) → hub:lodging (next) |
| `follows` | inverse of precedes |
| `triggers` | rollup-executed action → next hub step |

---

## Travel playbook (deterministic)

```text
flight → lodging → rental_car
```

## Food playbook

```text
meal → navigate → taxi
```

## Schedule playbook

```text
schedule → reminder → calendar → todo
```

## Rollup triggers

When `learning-rollup` shows `executed >= 1` for a playbook step, emit:

```text
(action:meal) -[triggers]-> (action:navigate)
```

`semanticMainHint` prefers `triggers` > `precedes` > hub sequence > domain next step.

LLM may **read** triples; registry + contract gate **execute**.

---

## Code map

| Module | Role |
|--------|------|
| `lib/semantic/types.ts` | Closed enums + `SemanticTriple` |
| `lib/semantic/semantic-id.ts` | `ec:`, `hub:`, `action:`, `person:`, `place:` |
| `lib/semantic/food-playbook.ts` | Food action sequence |
| `lib/semantic/schedule-playbook.ts` | Schedule action sequence |
| `lib/semantic/project-playbook-triples.ts` | Food / schedule SPO |
| `lib/semantic/project-rollup-trigger-triples.ts` | Rollup `triggers` edges |
| `lib/semantic/action-category-map.ts` | `@` featureId ↔ ActionCategory (validated) |
| `lib/semantic/travel-playbook.ts` | Hub sequence + labels |
| `lib/semantic/resolve-semantic-main-hint.ts` | One next step for UI |
| `lib/semantic/semantic-grounding-prompt.ts` | Compact LLM knowledge block |

---

## Non-goals

- Graph DB / persisted triple store  
- LLM-invented predicates writing to SSOT  
- Parallel suggestion UI listing all triples  
- Domain LLM slot fill before `@` registry (see `ACTION_OS_SPINE.md`)
