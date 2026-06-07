# Rimvio Constitution

Rimvio is **not** a chatbot, calendar, messenger, note-taking app, or generic AI agent.

**Rimvio is an Experience OS.**

Rimvio structures user experience data across **time · place · people · action**, and suggests and executes next actions from **accumulated context**.

Rimvio remembers photos, location, and conversations from the day, and is the app that most seamlessly continues what the user wants to do next.

**Mission:** Turn lived context into the next meaningful action — not open-ended chat.

---

## North Star

Users should **not** think about apps — they should think about **situations**.

Users should **not** search for tools — tools should arrive when useful.

Users should **not** organize resources — resources should gather around the situation.

Users should **not** remember every next step — the system should surface useful actions.

**Experience layers (build in order — do not skip):**

```
FACT → EXPERIENCE → MEANING → RECALL → ACTION
```

Full spec + examples + code map: **`docs/RIMVIO_EXPERIENCE_LAYERS.md`**

| Layer | One line |
|-------|----------|
| **FACT** | Photos, GPS, links, chat, events — what happened |
| **EXPERIENCE** | Bundled node the user understands ("민수랑 제주 Day2") |
| **MEANING** | Why it matters *to this user* (patterns, relationships, seasons) |
| **RECALL** | Right memory at the right moment — first emotional beat |
| **ACTION** | Memory → operable next step (`@`, navigate) — not generic AI |

**2026-06 maturity:** FACT ✓ · EXPERIENCE ✓ · MEANING △ · RECALL △ · ACTION ✓.  
**Moat:** MEANING + RECALL compound over time; ACTION is replaceable.

**Main screen (Three Floors — UI stack on Feed):** **`docs/RIMVIO_THREE_FLOORS.md`**

```text
1층 REPLAY   — 🌍 핑 · ▶ 쇼츠 · 한 줄 캡션
2층 CONTEXT  — 사람 · 경험 · 장소 · 시간
3층 ACTION   — 길찾기 · 일정 · 공유 · @ (weak until invited)
```

Future Feed hero: **not** search · chat · recommendation lists — **replay + context first**. Mature competitor = human memory, not AI apps.

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
| §8 Execution | Dispatchers / deep links — no SSOT ownership |

See also: `docs/RIMVIO_SYSTEM_AUDIT.md`, `docs/ORCHESTRATOR_OS_LAYERS.md`, `.cursor/rules/rimvio-jobs-layers.mdc`.
