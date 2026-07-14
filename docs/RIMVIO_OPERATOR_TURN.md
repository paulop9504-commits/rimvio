# Rimvio Operator Turn — Context SSOT + Short Dialogue + Fixed Tool Gate

**Audience:** 맥락 AI (Container AI / Trip Assistant)  
**Law:** deterministic gate first · LLM only for classify / copy / chips  
**Not:** free ReAct (Thought→Action→Observation loops inventing tools)

Related: [`RIMVIO_CONTAINER_AI.md`](./RIMVIO_CONTAINER_AI.md) · [`RIMVIO_CONTRACT_SCHEMA.md`](./RIMVIO_CONTRACT_SCHEMA.md)  
Code: `lib/globe/operator-turn/`

---

## Mantra (Cursor-shaped, Rimvio-owned)

| Cursor | Operator turn |
|--------|----------------|
| Repo | **Context SSOT** (event · scout contract · lens · lastBatch · reel) |
| Chat | **Short dialogue** (compose thread ≤ N turns · chips over essays) |
| Tools | **Fixed tool whitelist** (one Act per turn) |

```text
every user turn:
  READ  OperatorTurnSsot
  GATE  pick exactly one OperatorFixedTool
  ACT   execute that tool (no second invent)
  WRITE SSOT / compose
```

---

## 1. Context SSOT (read every turn)

| Slice | Source | Purpose |
|-------|--------|---------|
| `contextEventId` | open frame | Scope key |
| `scoutContract` | `readScoutContract` | Active `contract_type: scout` |
| `selectedAnchor` | `readScoutSelectedAnchor` | Mixed-scout `anchor_ref` seed |
| `lensSession` | `readDiscoveryLensSession` | POV rings |
| `lastBatch` | `readContextConditionLastBatch` | `scout_id` ≡ `batchId` |
| `reelItemCount` / kinds | `buildGlobeResourceReelItems` | filter_inventory eligibility |
| `composeTail` | compose thread (last 6) | short dialogue only |
| `explorationMode` | `resolveExplorationMode` | convergent vs diffuse scout policy — [`RIMVIO_EXPLORATION_POLICY.md`](./RIMVIO_EXPLORATION_POLICY.md) |

Blueprint `readContainerAIContext` remains the **trip graph** gate (`gateContainerAIRequest`).  
Operator turn SSOT is the **Globe discovery surface** gate — both may apply; graph block wins when present.

---

## 2. Short dialogue

Allowed assistant moves:

- One status line + optional **chips**
- Filter confirm one-liner (`맛집만…`) only when tool = `filter_inventory`
- Scout summary from batch — not a re-explanation of trip inventory

Forbidden:

- Multi-tool “let me also…” in one turn
- Long free RAG answers that skip GATE
- Re-interpreting `scout` mid-thread into a different category without a new contract write

---

## 3. Fixed tool whitelist

| Tool id | When | Act |
|---------|------|-----|
| `lens_command` | NL matches lens parse & handled | move/resize/activate lens · prefetch |
| `filter_inventory` | Narrow cue **and** reel already has that kind | kind filter on Discovery reel |
| `small_talk` | classify → chat | short situational reply |
| `task_injection` | classify → task / action intent | context action injection |
| `scout` | search / bare domain / filter without slice | ScoutContract → anchor pin |
| `ask_chips` | trip intake / experience gap | one-screen chips · partial slot write · no scout yet |

**One tool per turn.** Chips that fire a new message start a **new** turn (still one tool).

LLM must **not** invent tools outside this table (no ReAct toolbox).

### System sequencer carve-out (post Plan approve)

User turn law still holds: **one Act**. After Plan / step approval, the **system** may fire **one** Operator Act via `requestOperatorAutoRun` (`plan_step_auto_scout` · `ingress_domain_entry` · `scout_retry` · `reject_rescout`).

This is **not** free ReAct multi-tool. It is a single seeded compose Act on the same whitelist (`scout` / `ask_chips`). Reality Commit remains human-gated.

## 4. Gate algorithm (deterministic first)

```text
text empty → no-op
lodging prep gap → ask_chips (trip_intake) STOP
trip experience gap → ask_chips (trip_experience) STOP  ← docs/RIMVIO_TRIP_EXPERIENCE_DOMAIN.md
try lens_command (caller: applyLensCommand) → if handled, STOP
parseResourceReelKindFilter:
  hit + reel has slice → filter_inventory STOP
  hit + no slice → scout STOP
else → classify (LLM/fallback):
  chat → small_talk
  task → task_injection (else fall through)
  search / default → scout
```

Scout path still owns convergence `ask_chips` **inside** its resolve before execute — not a parallel free agent.

Violations (contract B): still `assertScoutContractGate` on scout output.

---

## 5. Write-back

| Tool | Must write |
|------|------------|
| `lens_command` | lens session · optional compose |
| `filter_inventory` | reel kind filter event · compose one-liner |
| `small_talk` / `task_injection` | compose (± injection) |
| `scout` | ScoutContract · lastBatch · pins · reel focus |
| `ask_chips` | pending spec store · questions |

---

## 6. Non-goals

- Open-ended tool-calling agent
- Capital.Settlement / commit ledger execution
- Second discover UI surface

---

## PR check

1. New NL path adds a **whitelist tool id** (or reuses one) — no anonymous side effects  
2. Turn reads `readOperatorTurnSsot` (or equivalent fields) before Act  
3. User copy stays Trip Assistant — not “Context Condition AI” / not “ReAct”
