# Rimvio Constitution

Rimvio is **not** a chatbot, calendar, messenger, note-taking app, or generic AI agent.

**Rimvio is an Experience OS** — a **Context Operating System**.

Rimvio is a **synaptic context graph** — facts and resources (people, place, calendar, links, notifications) connect like neural edges. When context matches, **connections fire** and Rimvio **re-executes** the next action — not a passive dump of old photos.

---

## Article 0 — Context OS kernel law

> **Reality is never modified without an explicit Commit.**  
> **Intent never mutates Reality.**  
> **Blueprint never executes.**  
> **Execution never decides.**  
> **Humans own the final authority.**

These four lines plus human authority hold for travel, trade, medical, finance, smart home, and every future container.

**Execution Space law:** Globe AI designs the **stage** (Spatial Execution Graph) before domain search. Geography stays **hypothesis** or **unresolved** until the user confirms — never AI-picked destination.

**Mantras:** AI recommends · Humans decide · **AI prepares · Humans approve · Reality commits.**

Full five-layer spec: **`docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md`** · wire **`lib/context-blueprint/`**

---

Rimvio wires scattered resources into **one operable situation**, then runs again via `@` contracts, Context Run, prep surface, and Task Graph.

**Mission:** When context connects, re-execute the next meaningful action — not open-ended chat, not passive resurfacing.

**One-liner (KO):** 맥락이 연결되면, Rimvio가 다시 실행한다.

**Why Rimvio exists (2026-06):** Reduce **cognitive dissonance** — the gap between what the user lived (connected context), what the world is doing now (Pulse, opt-in aggregate), and what they do next (@ re-execution). **Time saved** is the felt result; the map confirms the situation, not endless browsing.

---

## North Star

Users should **not** think about apps — they should think about **situations**.

Users should **not** search for tools — tools should arrive when useful.

Users should **not** organize resources — resources should gather around the situation.

Users should **not** remember every next step — **trigger edges** should fire and **re-execute** when context matches.

**Rimvio is not a passive memory OS that resurfaces when time is right.** Recall is a **trigger edge**; ACTION is **re-execution** via `@` registry and Context Run.

**Rimvio AI is not a conversational AI — it derives and re-executes Task Graphs from truth when synaptic context matches.**

**Users create context only; Rimvio executes that context and projects it onto one Reality Surface (Globe)—Reality entities and the user’s Context Instances as layers/lenses, never two planets. Projection is read-only; Commit is truth.** See **ADR-027**.

**Durability law:** *Execution is disposable. Truth is durable.* Derived Execution Graphs are ephemeral and may be rebuilt at any time. Only committed truth is durable. Projection may be redrawn at any time; it never owns truth.

**Reconstruct test (scale / PR):** *Can this execution be reconstructed tomorrow?* — Re-entry is **RunState + Truth → Planner → derived graph**, not resuming a saved graph snapshot. Watcher reads truth; Planner regenerates the graph. **RunState** (minimal, durable): `graphId`, `goal`, `status`, `resumeHint`, `lastVisitedNode`, `updatedAt`. **Truth** (Commit only): `Event`, `MarketIntent`, `Reservation`, `Ledger`.

**Deterministic roles (LLM must not replace):** Core policy lives in code — not model inference. If the LLM starts choosing “ask this” vs “publish now”, execution rules dissolve into the model.

| Role | Decides |
|------|---------|
| **Planner** | Goal and rules; derives Task Graph from Truth + RunState |
| **Question Engine** | Which constraints are still missing (slot IDs) |
| **Execution Decision** | Auto-run, approval required, or ask again |
| **LLM** | Understand user language; phrase questions; explain outcomes — **never** goal, slot priority, or commit |
| **Commit** | Sole truth writer |
| **Projection** | Map, Hub, Portal, Field, UI — read-only surfaces |

Full stack: **`docs/CONTEXT_RUN_ENGINE.md`** · Globe UX: **`docs/GLOBE_EXECUTION_SURFACE_UX.md`**

**Experience layers (build in order — do not skip):**

```
FACT → EXPERIENCE → MEANING → RECALL → SITUATION PROJECTION → ACTION
```

Full spec + examples + code map: **`docs/RIMVIO_EXPERIENCE_LAYERS.md`**

| Layer | One line |
|-------|----------|
| **FACT** | Photos, GPS, links, chat, events — what happened |
| **EXPERIENCE** | Bundled node the user understands ("민수랑 제주 Day2") |
| **MEANING** | Synaptic weights — why edges matter *to this user* (patterns, relationships, seasons) |
| **RECALL** | **Trigger edge** — fires when context matches (place, time, people, calendar) — not passive photo dump |
| **SITUATION PROJECTION** | Solid + ghost situation map — AI layout, Commit promotes truth |
| **ACTION** | **Re-execution** — scattered resources → one operable situation via `@`, Context Run, prep surface |

**2026-06 maturity:** FACT ✓ · EXPERIENCE ✓ · MEANING △ · RECALL △ · ACTION ✓.  
**Moat:** MEANING + RECALL compound as **synaptic connections** that strengthen with use; ACTION (capabilities) is replaceable.

**Synaptic layer (engineering):** `docs/RIMVIO_SYNAPTIC_LAYER.md` · **Situation projection:** `docs/RIMVIO_SITUATION_PROJECTION_LAYER.md` · **Active spine:** `docs/ACTION_OS_SPINE.md`  
**Macro roadmap:** Phase 1 Memory Recovery → Phase 2 MEANING micro-surfaces → Phase 3 collective (opt-in, separate UI) — **`docs/RIMVIO_EXPERIENCE_LAYERS.md` § Product roadmap**.

**Main screen (Three Floors — Globe home at `/`):** **`docs/RIMVIO_THREE_FLOORS.md`**

**Globe four-layer model (Internal · Hub · Portal · External):** **`docs/RIMVIO_GLOBE_ARCHITECTURE.md`**

```text
1층 REPLAY   — 🌍 핑 · ▶ 쇼츠 · 한 줄 캡션
2층 CONTEXT  — 사람 · 경험 · 장소 · 시간
3층 ACTION   — 길찾기 · 일정 · 공유 · @ (weak until invited)
```

Future Globe home hero: **not** search · chat · recommendation lists — **replay + context first**. Mature competitor = human memory, not AI apps.

**Execution chain (single-turn orchestrator — same Experience node):**

```
Context → Experience → Intent → Goal → Action → Execution → Progress
```

*(Experience = EventCandidate + captures + plan — see §5 Experience Node.)*

---

## Core Principles

### 1. Action over features

People want outcomes, not features.

- Never ask: “Which feature should we build?”
- Always ask: “What user action becomes easier?”

Features are implementation details. **Actions are the product.**

### 2. Situations over apps

Users live inside situations (Osaka trip, startup project, dinner, job search, family event). Applications are tools. **Organize around situations, never around apps.**

### 3. Surfaces over screens

A **Surface** is the primary experience. It gathers actions, people, resources, events, conversations, reminders, documents, and locations around a situation.

Users should feel: *“Everything I need is here.”* — not *“I need another app.”*

### 4. Capabilities over products

Navigation, calling, messaging, scheduling, and translation are **capabilities** — replaceable. No product dependency may leak into architecture (e.g. Navigate → Kakao Navi today, internal navigation tomorrow).

### 5. Events are truth

Events are the primary life-state record:

```
EventCandidate → CommitTruth → EventStore
```

All life-state mutations flow through truth. **No projection, surface, or capability may own truth.** Truth must be singular.

#### Experience Node (Feed expression — no new schema)

**Experience** in the Feed is not a separate database model. It is the user-facing name for:

```
EventCandidate + feedCaptures + plan context = Experience Node
```

Goals and tasks appear only as **Actions inside** an Experience Node — never as a parallel queue the user must manage. Search is capture ingress; AI execution (food, directions, `@`) opens **after** an experience is selected on Feed.

**L2.5 Verify gate:** auto-attached captures are not auto-recommendations. Until the user taps **맞아요**, navigate / food / `@` spawn stays hidden or weak — creation ≠ execution.

### 6. Projections never own state

Calendar, timeline, feed, and views are projections. Views may be deleted and replaced; **truth remains**.

### 7. Input is not truth

Chat, voice, notifications, and imports are input. Input creates candidates; **input never becomes truth automatically**.

### 8. Execution is separate

Execution performs actions. It does not own state or UI. It receives instructions and acts.

### 9. Learning comes from behavior

Learn from actions (clicked, dismissed, completed, ignored, approved) — not primarily from words. **Behavior is stronger than intention.**

### 10. User agency is sacred

Rimvio assists, recommends, explains, and ranks. **The user decides.** The system must never silently take meaningful actions.

### 11. Action ontology, not analysis ontology

Rimvio’s graph is **not** an analyst workbench (Palantir-class Objects · Links · Properties for investigation). It is a **dynamic agent structure**: when recall edges fire, Rimvio **re-executes** via `@` contracts, Hub pipelines, Field FSM, and Context Condition AI — then writes back through Commit.

- **Static analysis graph** → human reads dashboard, acts outside the system.
- **Rimvio action graph** → context match → delegate execution → progress → truth.

Full contrast + code map: **`docs/RIMVIO_ONTOLOGY_LAYER.md`** § Thesis.

### 12. Context OS five layers (locked)

See **Article 0** above. Globe AI **Architect** → **Context Blueprint** → **Domain Executor** → **Context Condition AI** → **Commit**.

**Owner Rule:** Only the owner layer may mutate its own objects. **Forbidden Dependencies** and **State machine** in **`docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md`**.

Globe AI never executes domain logic. Blueprint never executes. Domain AI never recreates containers. Nothing irreversible without Commit.

---

## Architecture Law

Every module belongs to **exactly one** category:

| # | Category |
|---|----------|
| 1 | Source Of Truth |
| 2 | Projection |
| 3 | Input Layer |
| 4 | Capability |
| 5 | Surface |
| 6 | Execution |
| 7 | Infrastructure |

If a module fits multiple categories, **split it**.

---

## PR Review Law

Every pull request must answer: **which one is this?** (Surface, Capability, Truth, Execution, Infrastructure)

If the answer is **“several”** — the PR is too large. **Split it.**

---

## Final Test

Before shipping:

> Does this help the user reach the next meaningful action faster?

- **No** → do not build it.
- **Yes** → build it.

---

## North Star Experience

The user casually throws out a thought:

- “다음 주 오사카 가는데”
- “창업하고 싶어”
- “7시에 치킨집에서 보자”
- “3분 뒤 알려줘”

They should not need to know which app to open, which feature to use, where data lives, or how actions connect.

Rimvio gathers relevant actions, people, resources, and context into **one surface**.

The experience should feel like: *“The system already understands what I need next.”*

---

## Engineering alignment (reference)

| Constitution | Code direction |
|--------------|----------------|
| §5 Events are truth | `lib/events/event-store.ts` + `lib/source-of-truth/commit-truth.ts` only write path |
| §6 Projections | `readLifeProjections()` / `readSurface()` in `lib/life-read-model/` — no direct store reads in UI/display |
| §7 Input | Ingest adapters → candidates → commit; chat/voice/notifications never auto-truth |
| §3 Surfaces | `lib/surface-engine/` + `useSurfaceEngine` → FEED/CHAT/CALENDAR; UI render-only (`components/surface/`) |
| §4 Capabilities | `lib/capability-registry/` (WHAT) + `lib/execution/` (HOW) — provider URIs only in execution adapters |
| §8 Execution | `lib/execution/` — queue, lifecycle, adapters; UI never executes providers directly |
| §10 User agency | Recommend · rank · explain — user confirms meaningful actions |
| §11 Action ontology | `lib/ontology/` + situation projection + `@` registry — not graph explorer |

See also: `docs/RIMVIO_SYSTEM_AUDIT.md`, `docs/ORCHESTRATOR_OS_LAYERS.md`, `docs/RIMVIO_CAPITAL_OS.md`, `.cursor/rules/rimvio-jobs-layers.mdc`.
