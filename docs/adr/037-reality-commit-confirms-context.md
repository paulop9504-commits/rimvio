# ADR-037: Reality Commit confirms the Context Graph

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/` · `lib/reality-queue/commit-reality-queue-client.ts`  
**Related:** ADR-005 (Article 0) · ADR-022 · ADR-036 · `lib/reality-commit/assert-human-commit.ts`

## One sentence

> **Reality Commit does not “create a Context from a booking.” It confirms and densifies the Context Graph from Intent → Observation → Selection → Commit.**

## Wrong vs right

| ❌ | ✅ |
|----|----|
| 예약이 Context를 만든다 | **Reality Commit이 Context Graph를 확정한다** |
| 사용자 → 계획 입력 → 결과 | 사용자 → 현실 행동 → Reality 축적 → Context 강화 → 미완성 채움 → 실행 |

## Residue ladder (engine)

```text
Observation   — 봤다 (scout / candidates)     → ephemeral, no history
Selection     — 골랐다 (pin / Workspace 선택) → HotelSelected · confidence ~0.6
Commit        — 예약·구매·확정 (Field)        → HotelCommitted · Confirmed
Context Reality — Trip graph densified        → stay timeline · completeness · projection
```

Weak Intent (“오사카 여행 준비”) may mint a Planning bag.  
Commit turns Candidate stay into **Confirmed** and expands destination / period / missing slots.

## Pipeline after Commit

```text
Reservation Reality
        ↓
Context Node (Confirmed)
        ↓
Travel Timeline (stay segments)
        ↓
Missing Context Detection (completeness)
        ↓
AI Projection (fill gaps — never silent Reality mutate)
```

## Persist law (extends ADR-036)

| Layer | Persist? |
|-------|----------|
| Observation (search / 봤다) | **No** |
| Selection (선택) | Yes → `HotelSelected` / `RestaurantAdded` |
| Reality Commit (결제·확정) | Yes → `HotelCommitted` / `FlightCommitted` + Event metadata stamps |
| Soft prepare (`booking.prepare`) | Inbox only — **not** Commit |

## Completeness

Engine computes `Context Completeness` (lodging · flight · transport · guests · budget · food pref).  
AI projects DAY plans into **Generated** vs **Confirmed** — Confirmed only from Commit residue.

## Ask law (Context OS ≠ chatbot)

| Reality state | Behavior |
|---------------|----------|
| Confirmed (dates · lodging · destination) | **Never re-ask** (“며칠이에요?” forbidden) |
| Inferable from stay segments / Commit | Fill silently |
| Decision-needed gap (e.g. flight time) | **Action proposal**, not “입력해주세요” |

Wire: `lib/workstream/resolve-confirmed-reality-ask-gate.ts`

## UX reject

- “여행 계획 작성” as a required first step before any Reality action  
- Treating browse inventory as Confirmed stay  
- Collapsing Selection and Commit into one event
