# Rimvio Experience Layers

> **SSOT:** Product intelligence stack — layers must be built **in order**. Skipping a layer produces generic AI ("박명수").
>
> **Constitution:** [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) · **Product:** [RIMVIO_PRODUCT.md](./RIMVIO_PRODUCT.md)

---

## Stack (immutable order)

```text
FACT
 ↓
EXPERIENCE
 ↓
MEANING
 ↓
RECALL
 ↓
ACTION
```

Each layer **reads from** the layer below and **never replaces** it. Upper layers are projections + ranking — not a second truth store.

| Layer | Question | User feels |
|-------|----------|------------|
| **FACT** | What happened? | (invisible — raw record) |
| **EXPERIENCE** | What was that day/situation? | "아 오늘 이런 하루였네" |
| **MEANING** | Why does it matter to *me*? | "제주 = 민수와의 추억" |
| **RECALL** | When does the **trigger edge** fire? | "제주 도착 → 민수와 마지막 제주 이후 2년" — context match, not nostalgia dump |
| **ACTION** | What **re-executes**? | "그때 흑돼지집 다시 갈까요?" → `@길찾기` via contract registry |

**Rimvio moat:** Execution (ACTION) is commodity. **MEANING + RECALL** are time-compounding **synaptic connections** — edges between people, place, calendar, and links that only this user's graph can produce. When an edge fires, Rimvio **re-executes**; it does not passively remind.

**UI expression (Three Floors on Feed):** [RIMVIO_THREE_FLOORS.md](./RIMVIO_THREE_FLOORS.md) — Replay (핑·쇼츠·한 줄) → Context (사람·경험·장소·시간) → Action (길찾기·일정·@).

---

## L1 — FACT

**Role:** Atomic, verifiable records. No narrative.

**Ingress (collect):**

| Channel | Examples |
|---------|----------|
| Photo / video | EXIF time, album batch |
| Location / GPS | ping store, place label |
| Link | Share Target, URL |
| Chat | peer thread, plan metadata |
| Event | `EventCandidate` commit path |

**Output (facts):**

```text
2026-06-01 · 제주
민수와 함께
오후 7시
흑돼지집 방문
```

**Law:** Input is not truth until verified where required (L2.5 **맞아요** gate on auto-attached captures).

**Code (2026-06):** `lib/location-ping/` · `lib/feed/feed-capture-types.ts` · `lib/events/event-candidate.ts` · Search ingress · peer/plan metadata.

**Maturity:** ✓ **Strong** — collection path largely shipped.

---

## L2 — EXPERIENCE

**Role:** Bundle facts into a **human-understandable unit**.

**Example:**

```text
사진 12장 + GPS + 민수 + 식당
        ↓
"민수랑 제주 Day2"
```

**Model (no new DB):**

```text
EventCandidate + feedCaptures + plan context = Experience Node
```

**Surface:** Feed slots, drawer, headlines, verify chip, inline Globe recall shell.

**Law:** Goals/tasks live **inside** the node — not a parallel todo app.

**Code (2026-06):** `lib/feed/derive-experience-slot-headline.ts` · `resolve-feed-slot-peer-context.ts` · `feed-today-slot-card.tsx` · `feed-experience-recall-hero.tsx` · verify gate.

**Maturity:** ✓ **Strong** — MVP wow path (제주 Day2) demoable.

---

## L3 — MEANING

**Role:** Learn **what it means to this user** — not merely what occurred.

**Examples:**

| Pattern detected | Meaning surfaced |
|------------------|------------------|
| 민수 + 제주 × 7 | 제주 = 민수와의 추억 |
| 주말 카페 × 40 | 카페 탐방 취미 |
| 봄철 등산 × 15 | 봄 = 등산 시즌 |

**Question shift:**

- FACT/EXPERIENCE: *무슨 일이 있었는가*
- MEANING: *그게 사용자에게 어떤 의미인가*

**Law:** Learn from **behavior** (tap, dismiss, complete, verify) — §9 Constitution. Not from open-ended chat alone. No parallel suggestion store outside prep/Feed ranking.

**Code (2026-06):** `lib/meaning/` (graph projection) · `lib/context-weight/` (behavior + density) · `lib/preferences/` · archive rollup hooks.

**Maturity:** △ **In progress** — engine shipped; micro-surfaces (Phase 2) TBD.

---

## L4 — RECALL

**Role:** **Trigger edge** — when incoming context matches stored synaptic connections, the edge **fires** and surfaces the linked meaning. Not "remind user of old stuff"; **match → fire → prep for re-execution**.

**Synapse metaphor:**

```text
[민수]──[제주]──[흑돼지집]     dormant edges in graph
         │
    GPS: 제주 도착  ──►  TRIGGER FIRES  ──►  recall line + MAIN slot candidate
```

**Examples:**

| Context match (trigger) | Edge fires (recall copy) |
|-------------------------|--------------------------|
| 제주 도착 (GPS) | "민수와 마지막 제주 여행 이후 2년이 지났어요." |
| 비 오는 날 + place | "작년 장마철에도 이 카페에 자주 왔네요." |

**Law:** Recall is a **projection** — never owns truth. Context matches (place, weather, calendar, time-since, notification) **fire edges** that rank existing Meaning — do not invent memories or dump unrelated photos.

**Code (2026-06):** `lib/recall/` · Feed/Globe recall hero · spatial media sync · `resolve-gps-arrival-recall.ts` · recall spam gate.

**Maturity:** △ **In progress** — triggers + timing law shipped; Phase 1 Memory Recovery vertical slice ongoing.

#### Recall Timing Law

| When | Recall intensity |
|------|------------------|
| **Casual chat (ROOM)** | Quiet — capture & `@` execute only; no nostalgia spam |
| **Plan · trip · meetup proximity** | Medium — one related experience card |
| **Departure / arrival · pre-`@` intent** | High — one line + one media + optional action |
| **Evening Feed habit** | Day wrap — "오늘 이런 하루" |

Max **1–2 recall surfaces per day** unless user searches. Dismiss weakens that trigger type.

#### Social Recall Loop (human rhythm)

Friends repeat: travel talk → romance/nostalgia → shared memory → "let's go again" → forget → reunion.  
Rimvio **does not replace** that conversation — it opens the door (first domino) when **plan or action is ahead**.

#### Related Context on Feed (primary)

Active experience shows a **compact summary** on Feed — not in ROOM chat:

- Two axes: **사람** (`민수`) · **경험** (`제주 · 여행`)
- Tiny buttons: `사람 2` · `경험 3` → per-axis inline lists (peer match vs place/trip match)
- Tap a row → switch recall to that event · **Globe shows classified pins** (photo · video · GPS · dwell) for selected + softer pins for axis siblings

**Globe pin kinds:** `photo` emerald · `video` violet · `gps` sky · `dwell` amber · related-axis pins at 55% opacity.

Surfaces: `FeedExperienceRecallHero` (mini + full) · active slot card in drawer.

#### Related Context Search (수집 탭 — optional)

Users can also **search** stacked experiences before a trip or `@` run:

- Query: peer · place · trip (`민수 제주`, `제주 추억`)
- Result: Experience nodes → `/feed?recallEvent=` (projection read — no new truth)

**Code (2026-06):** `resolve-slot-related-context.ts` · `FeedRelatedContextStrip` · `search-related-context.ts` · Search `context_search`.

---

## L5 — ACTION

**Role:** **Re-execution** — when a trigger edge fires, ACTION runs the situation again via `@` contract registry, Context Run, prep surface (MAIN + AUX), and derived Task Graph. Recall must not dead-end in nostalgia.

**Examples:**

| Trigger fired / Experience | Re-execution |
|--------------------------|--------------|
| "민수랑 제주 Day2" | "그때 흑돼지집 다시 갈까요?" → `@길찾기` |
| "작년 이맘때 등산" | 근처 등산 코스 → `@` / navigate |

**Law:** ACTION opens **after** Experience is selected and (where required) verified. Generic 맛집/길찾기 without context = blocked (Search = 수집구). Re-execution uses the same `@` spine as proactive prep — no parallel action stores.

**Code (2026-06):** `feed-experience-run-chips.tsx` · `feed-verify-recommendation-gate.ts` · `run=mention` Search path · `@` registry · execution adapters.

**Maturity:** ✓ **Strong** — context-gated @ run shipped.

---

## Current snapshot (2026-06)

```text
FACT        ✓
EXPERIENCE  ✓
MEANING     △
RECALL      △
ACTION      ✓
```

**Gap:** We know *what the user did*. Synaptic edges (MEANING) are still thin — triggers fire weakly and re-execution can feel "helpful assistant" instead of "context connected, Rimvio ran it again."

**12-month bet:** Competitive edge is not chat or execution engines. It is how well we compound **synaptic connections** across FACT → EXPERIENCE → MEANING → RECALL (trigger edges). ACTION stays thin — capabilities are replaceable.

---

## Product roadmap (3 phases — locked 2026-06)

Macro phases for **experience intelligence**. Execution enrichers (Share, `@`, enrichers) stay in [RIMVIO_PRODUCT.md §9](./RIMVIO_PRODUCT.md#9-로드맵-제품-phase).

| Phase | Name | Strengthens | User feels |
|-------|------|-------------|------------|
| **1** | **Memory Recovery** | EXPERIENCE + RECALL (trigger edges) | "흩어진 사진·톡·prep가 **한 Event/Bridge**로 묶이고, **맥락이 맞을 때** 트리거가 걸려 다시 실행된다" |
| **2** | **MEANING micro-surfaces** | MEANING (projection) | "검색 전에 **지금 맥락**과 연결된 사람·장소·시간 관계가 보인다" |
| **3** | **Collective flow** (opt-in) | Anonymized stats only | "내 raw 데이터가 아니라 **익명·집계**된 흐름 통찰" |

### Phase 1 — Memory Recovery *(current)*

**Unit:** `EventCandidate` SSOT + **Bridge window** (media · chat · prep · GPS projection).

**Ship criteria:**

- Fragment → one experience window (Bridge API + journey timeline)
- Recall obeys **Recall Timing Law** (max 1–2/day · dismiss weakens trigger)
- Surfaces: Feed Replay · Globe pin · Bridge — **not** Life Replay archive UI

**Code map:** `lib/experience-bridge/` · `lib/recall/` · `lib/context-weight/` · Globe pin-open · GPS arrival recall.

### Phase 2 — MEANING micro-surfaces *(not Graph explorer)*

**Law:** Surfaces show **one contextual hint** — not a scrollable global knowledge graph.

| OK (Phase 2) | Reject |
|--------------|--------|
| Pin weight emphasis (3 levels) | Force-directed graph hero |
| People strip · "민수 = 제주" one-liner | Node counts · social metrics |
| Journey timeline (media · talk · prep) | "My whole life map" as primary UX |
| Recall reason chips | Search/chat as Feed hero |

**Engine:** `lib/meaning/` · `lib/context-weight/` — projection read only; no new truth store.

### Phase 3 — Collective flow *(research — after 1–2 compound)*

**Law:** **Personal UI and collective UI are physically separate surfaces.** Never mix personal SSOT with aggregate insights on one screen.

- Input: per-user MEANING **projections** only — never raw FACT export without opt-in
- Output: k-anonymized / statistical spacetime patterns (flow, seasonality)
- Requires: consent · retention · delete path before implementation priority

**Reject in Phase 3 PR:** Shared EventCandidate DB for "crowd truth" · blending Phase 2 personal graph with Phase 3 stats on Feed/Globe home.

---

## PR / build law

When adding a feature, name the **lowest layer it strengthens**:

| PR strengthens | OK when |
|----------------|---------|
| FACT only | Improves capture fidelity, verify, spacetime |
| EXPERIENCE | Bundles facts; Feed/Globe recall shell |
| MEANING | Behavior rollup, pattern labels — no new truth store |
| RECALL | Trigger + rank existing meaning — projection only |
| ACTION | `@` / capability from **selected** experience context |

**Reject:** UI that jumps to ACTION without EXPERIENCE context (generic AI). New truth stores for "insights." LLM-generated memories without FACT lineage.

---

## Relation to execution chain

Product layers (this doc) describe **user memory intelligence**. The orchestrator chain describes **single-turn execution**:

```text
Context → Experience → Intent → Goal → Action → Execution → Progress
```

- **Experience** in both maps to the same Experience Node.
- **Intent → Goal → Action** in orchestrator ≈ L5 ACTION path for one tap.
- **MEANING / RECALL** are mostly **offline rank + surface copy** — not a 5th ingest axis.

See: `docs/ACTION_OS_SPINE.md` · `.cursor/rules/action-os-spine.mdc`.
