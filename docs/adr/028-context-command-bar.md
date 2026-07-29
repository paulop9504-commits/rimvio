# ADR-028: Context Command Bar — not a search box

**Status:** accepted 2026-07  
**Wire:** `lib/context-command/` · PromptFrame (`globe-context-condition-prompt-frame`) · PinBar compose  
**Related:** ADR-022 · ADR-023 · ADR-025 · ADR-026 · ADR-027 · Article 0

## One sentence

> Globe 하단 입력은 **검색창이 아니라 Context를 조작하는 Command Bar**다. (Cursor Command Palette ↔ Reality)

사용자는 「둔산동에서 뭐 찾아줘」가 아니라  
**「내가 연 맥락을 어디에서·어떻게 실행할지」**를 지정한다.

## Wrong → Right

| Wrong | Right |
|-------|-------|
| 검색창 → 결과 리스트 | Command → Context Operation → Projection |
| 위치 = 검색 중심점만 | 위치 = Context **anchor** (실행 장소) |
| 찾아줘 = only verb | 이동 · 복제 · 기준 변경 · 저장 · 예약 준비 |
| External / Internal 두 지구 | **One Globe** — Reality Entity ↔ Context Instance (ADR-027) |

## Pipeline

```
User Prompt
  → Intent Compiler (NL pipeline + context-command classify)
  → Context Operation (migrate · clone · retarget · save · prepare)
  → Context Graph Update
  → Projection (Workspace / pins / compose)
  → Commit-ready (Field · human)
```

Do **not** invent a parallel Ultimate Parser — extend `NL_PIPELINE_STAGES` + `lib/context-command/`.

## Operations (v1)

| Op | Example utterance | Effect |
|----|-------------------|--------|
| **migrate_anchor** | 「이 맥락 제주도로 옮겨줘」 | Same Context Instance · new place · Reality re-scout |
| **clone_context** | 「둔산동 맛집 맥락 제주도에도 만들어줘」 | New Context · same criteria · new place |
| **save_snapshot** | 「이 상태 저장해줘」 | Workspace / Capsule snapshot (existing auto-save path) |
| *(later)* retarget_time / purpose / party | 「내일 기준」「데이트 코스로」 | Preference / temporal patch |

`move_context` (Graph Command) remains **folder/project move** of a node — different from **migrate_anchor**.

## UI chrome (PromptFrame)

| Region | Shows |
|--------|-------|
| Header | Active Context title · place · status (활성화 / 맞추는 중) |
| Body | Compose thread · Focus / Workspace preview |
| Command Bar | Placeholder = *무엇을 할까요?* — not *주변 맛집 찾아줘* |
| Submit | **실행** — not 「꽂기」 as the product verb |

Search/scout remains a **subcommand** when the user asks to find places — not the default identity of the bar.

## PR reject

- Framing PromptFrame as “map search box” in L1 / onboarding
- Migrating by opening a second Earth (ADR-027)
- Clone that duplicates `EventCandidate` truth roots without lineage (`attrs.clonedFrom`)
- LLM that Commit’s Reality without human gate

## Ship order

1. L1 copy + header = Context identity  
2. `classifyContextCommand` + `runContextCommand` (migrate · clone · save)  
3. Wire before free-NL scout in PinBar  
4. Harden retarget_time / purpose as Workspace patches  
