# Rimvio Constitution Layer

**Status:** locked 2026-08  
**Platform north star:** [`RIMVIO_AGENT_HUB_VISION.md`](./RIMVIO_AGENT_HUB_VISION.md)  
**Role:** Policy **index** — Intent…Audit. Not a second kernel.  
**Kernel law (always wins):** [`RIMVIO_CONSTITUTION.md`](./RIMVIO_CONSTITUTION.md) Article 0  
**Agent runtime laws:** [`RIMVIO_AGENT_OPERATING_CONSTITUTION.md`](./RIMVIO_AGENT_OPERATING_CONSTITUTION.md) (ADR-049) · ADR-048

> This document defines **what must be decided** in each policy domain and **where the code/ADR already lives**.  
> Do not invent parallel state machines, compilers, or essay SSOT beside Article 0 / Context Workspace / Agent Constitution.

```text
Rimvio OS Constitution Layer

├── 0. Article 0 (kernel)
├── 1. Agent Behavior Policy
├── 2. Intent Policy
├── 3. Context Policy
├── 4. Reality Object Policy
├── 5. Entity Binding Policy
├── 6. Workspace Policy
├── 7. Planning Policy
├── 8. Execution Policy
├── 9. Commit Policy
├── 10. Memory Policy
├── 11. Trust & Safety Policy
├── 12. Data Policy
├── 13. Learning Policy
├── 14. Interface Policy
├── 15. Agent Collaboration Policy
├── 16. Capability Policy
├── 17. Simulation Policy
├── 18. Recovery Policy
└── 19. Audit Policy
```

---

## 0. Article 0 — Kernel

**One line:** Reality mutates only through explicit human Commit.

**Must:** Intent / Blueprint / Execution stay separated; humans own final authority.  
**Must not:** Auto Reality Commit from chat, Workspace soft edit, or Agent loop.

**Canonical:** [`RIMVIO_CONSTITUTION.md`](./RIMVIO_CONSTITUTION.md) · [`RIMVIO_CONTEXT_OS_ARCHITECTURE.md`](./RIMVIO_CONTEXT_OS_ARCHITECTURE.md) · ADR-005  

**PR reject:** Silent truth write · Intent that mutates Reality · Blueprint that executes.

---

## 1. Agent Behavior Policy

**One line:** Agent mutates Workspace / Graph like Cursor — Patch first, never essay SSOT.

**Must:** Clear intent → replace; soft intent → refine; Diff first; tool loop; Commit waits for human.  
**Must not:** Chat as booking truth; invent hotels only in assistant text; mutate without Diff.

**Canonical:** [`RIMVIO_AGENT_OPERATING_CONSTITUTION.md`](./RIMVIO_AGENT_OPERATING_CONSTITUTION.md) · [`RIMVIO_CURSOR_AGENT_POLICY.md`](./RIMVIO_CURSOR_AGENT_POLICY.md) · ADR-048 · ADR-049 · `lib/agent-policy/` · `lib/context-run/workspace-agent-loop.ts`

**PR reject:** Soft phrase forcing full inventory replace when filter suffices · Clear find (“캡슐호텔 찾아”) that only re-ranks without rescout when stay-type changed · LLM essay as only record of change.

---

## 2. Intent Policy

**One line:** Interpret utterance dimensions; never invent missing preference axes.

**Must define:** Intent detection · confidence · ambiguous handling · intent-change detection · conflict resolution.

| Signal | Policy |
|--------|--------|
| Clear constraint (“캡슐호텔 찾아”) | **Replace / rescout** — candidates already full ≠ ignore |
| Soft refine (“더 싸게”) | **Refine** in-set when possible |
| Ambiguous (“좋은 호텔”) | **No arbitrary fill** of price vs location vs review vs amenity — clarify or soft refine with evidence, never silent weight invent |
| Intent change | New Intent may spawn new Context (ADR-029); do not silently overwrite another trip |

**Canonical:** ADR-048 · ADR-029 · `lib/agent-policy/resolve-workspace-mutation-mode.ts` · `lib/context-run/is-workspace-agent-work-utterance.ts` · lodging stay parsers

**PR reject:** Filling “좋은” with hidden ranking weights · Routing clear stay-find to Spatial→restaurant default · Essay ask path for work-shaped Globe Prompt.

---

## 3. Context Policy

**One line:** Context = one real-world goal unit — not per-slot storage silos.

**Must:** Osaka Trip holds hotel · food · itinerary · booking · cost together.  
**Must not:** Separate DBs/UI “projects” per lodging vs eatery as product identity.

**Canonical:** ADR-022 · ADR-029 · ADR-027 (one Globe) · `lib/context-workspace/` · Globe Ingress

**PR reject:** Parallel result stores bypassing session Context / Workspace · New Intent dumped onto wrong open hub without spawn gate.

---

## 4. Reality Object Policy

**One line:** Map objects have a Prepared lifecycle — not a second enum invented in docs.

**Product language → code map (no new enum):**

| Product word | Code / meaning |
|--------------|----------------|
| discovered / candidate | node visible · `ActionReadyState` omitted / `discover` |
| recommended | ranked / callout / match — still not Reality |
| selected | `selected` / bookmarked |
| reserved / prepared | `prepare` → `ready` → Field |
| completed | `approved` / `committed` after human Commit |
| expired | hide / archive fold — not a parallel store |

**Canonical:** ADR-014 · ADR-018 · ADR-020 · `lib/context-workspace/types.ts` (`ACTION_READY_STATES`) · `lib/reality-object/`

**PR reject:** New `discovered|…|expired` TypeScript enum beside `ActionReadyState` · Bookmark/favorite as product truth instead of Reality Object.

---

## 5. Entity Binding Policy

**One line:** Text → Reality Entity → placeId → coordinate → capability; ambiguity stays hypothesis.

**Must:** Resolve anchors before External Action; 「난바」= district / station / hotel / area — confirm or present candidates.  
**Must not:** Confirm destination / place the user did not state (Execution Space law).

**Canonical:** ADR-023 · Globe Ingress · `lib/spatial-retrieval/` · `lib/globe-ingress/`

**PR reject:** Silent geo confirm · Search pins on 3D Globe before Commit for lodging/eatery inventory.

---

## 6. Workspace Policy

**One line:** Workspace manages Reality **State** for one Intent — not a chat archive.

**Product language → code status:**

| Product | Code (`ContextWorkspaceStatus`) |
|---------|----------------------------------|
| Created / Planning / Executing | `editing` |
| Waiting Approval | `committing` (+ Field / Commit preview) |
| Completed | `committed` |
| Archived | `closed` |

**Canonical:** [`RIMVIO_CONTEXT_WORKSPACE.md`](./RIMVIO_CONTEXT_WORKSPACE.md) (definition) · [`RIMVIO_REALITY_ANCHOR_PROJECTION.md`](./RIMVIO_REALITY_ANCHOR_PROJECTION.md) (Anchor · Patch · Map Projection) · ADR-022 · ADR-024 · ADR-025 · ADR-026 · `lib/context-workspace/`

**PR reject:** Workspace first paint with ≥2 Primary domain cards (One Focus) · Manual Save as primary verb · Globe as live street editor · Treating Chat as Workspace SSOT · Map as search-results list bypassing Workspace Patch.

---

## 7. Planning Policy

**One line:** Think → Plan → Execute via Task Graph — LLM does not own goal order.

**Must:** Dependency · priority · parallel only where graph allows (e.g. flight before stay when required).  
**Must not:** One LLM call that Intent+Commit Reality.

**Canonical:** ADR-007 · ADR-011 · ADR-021 · [`CONTEXT_RUN_ENGINE.md`](./CONTEXT_RUN_ENGINE.md) · Planner / Question Engine roles in Constitution

**PR reject:** Inverted Search stages · Parallel “Ultimate Parser” beside `NL_PIPELINE_STAGES`.

---

## 8. Execution Policy

**One line:** Separate Internal (search/rank) from External (reserve/pay/delete).

| Kind | Examples | Gate |
|------|----------|------|
| Internal | search · analyze · sort · patch | Soft OK |
| External | reserve · pay · delete Reality | Field / Commit |

**Canonical:** ADR-006 · ADR-048 Soft/Dangerous · `lib/prepare-layer/` · Field FSM

**PR reject:** Soft condition edits opening Field Commit · External Action without Capability.

---

## 9. Commit Policy

**One line:** Draft → Prepared → Committed; only humans approve Reality.

```text
AI recommend / Draft
    ↓
Prepare (booking.prepare etc.)
    ↓
Human approve (Field / Reality Commit swipe)
    ↓
Committed truth
```

**Canonical:** Article 0 · ADR-037 · ADR-047 (unit on Prepare/Commit) · Workspace Commit region (ADR-026)

**PR reject:** Auto pay · Auto Reality Commit from Agent Loop · Prepare treated as booked.

---

## 10. Memory Policy

**One line:** Remember decisions, preferences, Context, Reality history — not one-off search chatter.

**Store:** Decision · Preference · Context · Reality History  
**Do not store as preference SSOT:** one-shot questions · temporary search dumps

**Canonical:** Constitution §9 Learning · cross-context memory · Action OS archive rollup (spine) · ADR-002 (archive UI frozen)

**PR reject:** Treating every NL utterance as durable preference · Server archive UI work while frozen.

---

## 11. Trust & Safety Policy

**One line:** Evidence > Opinion on recommendations.

**Must:** Why · grounding · source on demand (Decision Trace / Callout).  
**Must not:** Rank without evidence when claiming “best”.

**Canonical:** ADR-044 · ADR-046 · Agent Constitution laws 14 · 24 · 25 · Callout / Decision Trace

**PR reject:** Recommend without Evidence · Hiding Commit risk behind chat tone.

---

## 12. Data Policy

**One line:** Every measured object carries Source · Timestamp · Confidence · Freshness where applicable.

**Example:** Hotel price — Booking/LiteAPI source · updated ago · nightly vs stay total (Unit Canon).

**Canonical:** ADR-047 · [`RIMVIO_UNIT_CANON.md`](./RIMVIO_UNIT_CANON.md) · provider adapters

**PR reject:** Bare numbers without unit/context · Mixing nightly UI with stay-total as if identical.

---

## 13. Learning Policy

**One line:** Learn from **selection behavior**, not search chatter.

| Signal | Weight |
|--------|--------|
| User selects near-station hotel | transport_priority ↑ |
| User rejects cheap distant option | location vs price weights update from **choice** |
| Repeated “찾아” queries alone | **not** preference SSOT |

**Canonical:** Constitution §9 · Agent Constitution law 23 · `learnPreference` paths

**PR reject:** Training preference solely from raw search strings · Persona+slot in one LLM call as ranking truth.

---

## 14. Interface Policy

**One line:** Diff First · Context Second · Explanation Third.

**Default UI:** What changed (nodes / Callout / map).  
**On demand:** Why (Decision Trace).  
**Not default:** Long assistant essay.

**Canonical:** ADR-048 Dual surface · ADR-026 six regions · UX Constitution (Globe vs Field)

**PR reject:** Search results only in assistant text · First paint teaching Workspace+WHY+Agent+Draft+Forest together.

---

## 15. Agent Collaboration Policy

**One line:** Multi-agent ownership is defined before parallel External Actions.

**Must (when multiple agents):** Owner · conflict resolution · authority bounds.  
**Status:** **Principle locked · implementation later** (single Agent runtime ADR-045 is current ship).

**Canonical:** ADR-045 · ADR-008 Container AI (internal modules, one user-facing AI)

**PR reject:** Shipping multi-owner External Action without Owner rule · User-facing “Travel Agent / Finance Agent” product nouns before runtime exists.

---

## 16. Capability Policy

**One line:** Agent may only invoke registered Capabilities.

**Examples:** Search Hotel · Compare Price · Create Route · Reserve · Pay — each gated.  
**Must not:** External Action without Capability check.

**Canonical:** ADR-006 · `@` Action Contract Registry · Action OS spine · Agent Constitution law 22

**PR reject:** LLM domains not in `@` registry · Capability-less reserve/pay.

---

## 17. Simulation Policy

**One line:** Predict impact before dangerous or costly replace when graph supports it.

**Example:** Hotel change → +40m walk time / +₩20k — show Diff, then human decides.

**Status:** **Principle locked** · Callout Simulate / Workspace simulate soft paths exist; full economic simulation later.

**Canonical:** Callout Simulate · Workspace `op: "simulate"` · Agent Constitution progressive disclosure

**PR reject:** Simulation that auto-Commits · Simulation essay without Workspace Diff.

---

## 18. Recovery Policy

**One line:** On failure: Detect → Repair Plan → Alternative → Notify user.

**Example:** Reservation fail → re-prepare or alternative scout → short status — no silent drop.

**Status:** **Principle locked · partial wire** (statusKo / toast / prepare errors). Full repair planner later.

**Canonical:** Prepare failure paths · Agent Loop verify/wait · Article 0 (no fake success Commit)

**PR reject:** Swallowing External Action failure into success chat · Auto retry pay without human.

---

## 19. Audit Policy

**One line:** Enterprise-grade Who / When / Why / What Changed for Reality mutations.

**Status:** **Frozen / later** — personal OS ships Commit truth + Patch log; full audit ledger out of Action OS spine active loop.

**Canonical:** Workspace `patches` log · Commit truth · Action OS telemetry kinds (substrate)

**PR reject:** Blocking personal MVP on full audit infra · Silent Ghost truth-log / site egress patterns.

---

## Intent → Commit (quick flow)

```text
Utterance
  → Intent Policy (clear | soft | ambiguous)
  → Context / Workspace resolve
  → Plan / Capability gate
  → Internal Execution (Patch / Scout)  OR  External Prepare
  → Diff / Interface
  → Human Commit
  → Memory / Learning (from decision)
```

---

## Related indexes

| Doc | Role |
|-----|------|
| [`RIMVIO_CONSTITUTION.md`](./RIMVIO_CONSTITUTION.md) | Kernel + product mission |
| [`RIMVIO_AGENT_OPERATING_CONSTITUTION.md`](./RIMVIO_AGENT_OPERATING_CONSTITUTION.md) | Agent 25 laws |
| [`RIMVIO_UX_CONSTITUTION.md`](./RIMVIO_UX_CONSTITUTION.md) | Globe vs Field classifier |
| [`RIMVIO_CONTEXT_OS_ARCHITECTURE.md`](./RIMVIO_CONTEXT_OS_ARCHITECTURE.md) | Five layers |
| [`ACTION_OS_SPINE.md`](./ACTION_OS_SPINE.md) | Active vs frozen build loop |
