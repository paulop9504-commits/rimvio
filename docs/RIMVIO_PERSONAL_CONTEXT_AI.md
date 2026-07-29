# Rimvio Personal Context AI

> **Canonical.** Globe ask sheet (`CaptureSheet`) · Guardian scope on **내 맥락** lens.  
> **Architecture:** [ADR-027](./adr/027-one-globe-reality-context-layers.md) — One Globe.  
> **Response system:** [RIMVIO_CONTEXT_AI_RESPONSE.md](./RIMVIO_CONTEXT_AI_RESPONSE.md) · [RIMVIO_EXPERIENCE_LAYERS.md](./RIMVIO_EXPERIENCE_LAYERS.md) · [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md)

---

## Thesis

Rimvio AI is **not** a generic chat bot. It is **Context Understanding → Retrieval → Intelligence** over lived experience.

| Wrong | Right |
|-------|-------|
| Open-ended chat completion | Question → search stored context → reason → operable answer |
| Post / feed item as unit | **Bridge** (`EventCandidate`) as unit |
| Guess when data is missing | **Never guess** — answer only from stored bridges |
| Long prose replies | One-line summary + Bridge cards + ACTION CTAs |

**Personal / Context AI (내 맥락):** Memory OS — recall people, places, trips, schedule from the user's own traces.  
**Discovery AI (발견):** Opportunity OS — see [RIMVIO_EXTERNAL_GLOBE_AI.md](./RIMVIO_EXTERNAL_GLOBE_AI.md).

---

## Flow

```text
User question (ask sheet)
  → parse intent + slots (person · place · time)
  → retrieve EventCandidates (life read model)
  → build RecallEventSnapshot per hit
  → deterministic summary + bridge cards
  → optional ACTION (지도에서 보기 · 일정 열기)
```

No LLM in Phase A. Orchestrator / vector RAG may augment retrieval later; they **cannot** invent facts.

---

## Core unit: Bridge

Code SSOT: `EventCandidate` (`lib/events/event-candidate.ts`).

A Bridge bundles:

- **Who** — plan peer, attendees (`recall-event-snapshot` people)
- **Where** — place, globe pin, city
- **When** — `datetime`, calendar (`gcalEventId`)
- **What** — title, captures, pin context note

맥락톡 threads and globe pins **project** bridges; they are not separate truth.

---

## Query classes (Phase A)

| User pattern (KO) | Intent | Retrieval |
|-------------------|--------|-----------|
| `철수랑 마지막으로 만난 곳` | last meet + place | person match → latest `atIso` with place |
| `작년 제주` | travel recall | place + year filter |
| `엄마랑 갔던 맛집` | place with person | person + food/place tokens |
| `이번 주 일정` | schedule week | `datetime` in week window |
| `정성이랑 상하이 사진` | photo recall | person + place → bridges → `collectBridgeMediaForAsk` |

Unmatched queries: token match on title · place · people · note; empty state if no hits.

---

## Response shape

1. **Summary** — one line from facts (L1 copy in `lib/copy/human-ko.ts` → `globe.askSheet.result.*`)
2. **Bridge cards** — title, place, date, reason chip
3. **ACTION** — `requestGlobeAskBridgeFocus(eventId)` when on globe; no fabricated navigation

Forbidden in replies: 업로드 · 게시 · 좋아요 · 별점 · generic “AI thinks…”.

---

## Code map

| Layer | Path |
|-------|------|
| Parse | `lib/personal-context-ask/parse-personal-context-query.ts` |
| Resolve | `lib/personal-context-ask/resolve-personal-context-ask.ts` |
| Format | `lib/personal-context-ask/format-personal-context-reply.ts` |
| Collect | `lib/personal-context-ask/collect-bridge-media-for-ask.ts` |
| Photo thumb | `components/globe/personal-context-ask-photo-thumb.tsx` |
| Focus bridge | `lib/globe/globe-ask-bridge-focus.ts` |
| Tests | `scripts/test-personal-context-ask.ts` |

---

## Phase roadmap

| Phase | Scope |
|-------|-------|
| **A** (now) | Client deterministic retrieval over `listLifeEventCandidates()` |
| **B** | Discovery / alignment ask on discovery lens |
| **C** | Context graph + vector RAG **retrieve only**; LLM formats, does not invent |

---

## PR reject

- Chat-style streaming without bridge retrieval
- Answers when `hits.length === 0` beyond empty-state copy
- Mixing internal recall with external discovery on one answer
- New parallel event store for ask path
