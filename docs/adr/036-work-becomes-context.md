# ADR-036: Work becomes the Context

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/` · softens ADR-029/030 user-facing “create Context” verbs  
**Related:** ADR-021 · ADR-022 · ADR-025 · command-first (`lib/rimvio-command/command-first.ts`)

## One sentence

> **Never ask users to create a context. Let their work become the context.**

Context · Session · Project · Workspace ID are **engine implementation**, not product nouns the user must manage.

## User feels

> “내가 작업하면 AI가 알아서 이어서 정리하고, 필요한 순간에는 현실(예약·결제·실행)까지 연결해 준다.”

## Internal pipeline

```text
Input → Workstream → Planner → Object Graph → Reality Commit
```

- **Workstream** — ordered residue of meaningful work (`HotelSelected`, `RestaurantAdded`, …)
- **Planner / Object Graph / Commit** — existing Workspace + Reality spine
- **Context (`EventCandidate`)** — durability bag the engine owns; not a “create project” UX

## Persist law

| User action | Persist workstream event? |
|-------------|---------------------------|
| 「숙소 찾아줘」 / scout / candidate refresh | **No** (Observation — ephemeral) |
| 호텔 **선택** / pin | **Yes** → `HotelSelected` (Selection · Candidate) |
| 맛집 **추가** / pin | **Yes** → `RestaurantAdded` |
| 일정 변경 | **Yes** → `ScheduleUpdated` |
| 예산 수정 | **Yes** → `BudgetUpdated` |
| Field **Reality Commit** (예약·결제 확정) | **Yes** → `HotelCommitted` / `FlightCommitted` — densifies Context Graph (ADR-037) |

> Reality Commit does not invent a Context from thin air — it **confirms** Selection into Context Reality.

## Title law

- First paint: **Untitled** / Scratch
- As workstream events accumulate, engine may rename (e.g. 「제주 4박5일 여행」, 「하이텍팜 입사 준비」)
- User never names a Context to start working

## Workspace growth

```text
Scratch → Hotel Object → Restaurant Object → Rental Object → …
```

Workspace grows only as far as the user works — same as Cursor’s empty editor filling with code.

## UX reject

- Teaching 「이 맥락에 이어서」 as a required verb to continue work
- Approval chips whose only job is “맥락 생성 승인”
- Sidebar / empty states that force “새 맥락” before any utterance
- Treating search results as durable history

## Compatibility

- ADR-022 Auto Save Snapshot stays (implementation).
- ADR-029 spawn may still mint an internal `EventCandidate` when intent domain flips (travel ↔ market) — **silently**, without asking the user to create a Context.
- ADR-030 reference links stay optional engine glue — never a blocking “Context 관리” quiz on the hot path.
