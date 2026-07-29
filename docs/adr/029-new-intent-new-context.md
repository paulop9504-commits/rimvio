# ADR-029: New Intent → New Context (attach only when asked)

**Status:** accepted 2026-07  
**Wire:** `lib/context-run/should-spawn-new-context.ts` · `dispatch-context-run` · PromptFrame PinBar  
**Related:** ADR-025 One Intent · ADR-024 · ADR-028 Command Bar · Article 0

## One sentence

> **새 Intent는 기본으로 새 Context를 연다.** 이전 맥락에 붙이는 건 사용자가 말할 때만.

## Wrong → Right

| Wrong | Right |
|-------|-------|
| 둔산동 맛집 Context에 「오사카 4박5일」을 이어서 덮어씀 | 오사카 여행 = **새 Context + 새 Workspace** |
| Hub가 열려 있으면 무조건 그 eventId에 refresh | Hub는 **실행 표면**일 뿐, Intent 소유자가 아님 |
| Converge를 기본으로 강제 | Converge / 「이어서」는 **opt-in** |

## Decision table

| Utterance | Active Context? | Action |
|-----------|-----------------|--------|
| 「오사카 4박5일 여행 일정 짜줘」 | any | **Spawn new** |
| 「대리 뛸게」 | any | **Spawn new** (workspace kind) |
| 「이 맥락에 이어서」「여기서 계속」「기존 맥락에 연결」 | yes | **Attach / continue** |
| 「제주도로 옮겨줘」 (Command Bar migrate) | yes | Stay — migrate_anchor (ADR-028) |
| 「근처 맛집」 refine/scout | yes (same kind surface) | Stay — work in place |

## Pipeline

```
User Intent
  → shouldSpawnNewContext?
       yes → mint / pending 「생성」 / continuum on NEW id
       no  → attach active Context (explicit continue or in-place refine)
  → Workspace · Focus · Commit
```

## Explicit continue cues (L3)

`이어서` · `이 맥락` · `여기서 계속` · `기존 맥락` · `연결해서` · `지금 맥락`

## PR reject

- Refreshing `existingEventId` for a **new trip / new WorkspaceKind** Intent without continue cue  
- Auto-merging unrelated destinations into the open hub Context  
- Treating PromptFrame open as “all NL belongs to this Context”

## UX note

After spawn, switch focus to the new Context (`onAttached` / ask-bridge).  
Optional **Reference Links** (style / preference) = [ADR-030](./030-context-reference-link.md) — chips only, never silent merge.
