# ADR-025: One Intent → One Workspace → One Focus

**Status:** accepted 2026-07  
**Wire:** `lib/workspace-kind/` · `docs/RIMVIO_UX_CONSTITUTION.md`  
**Related:** ADR-022 · ADR-024 · Jobs L0 «One thing at a time» · Stack 1장

## One sentence

> **사용자는 항상 한 가지 일만 보고 있다.**

## Triad (locked UX philosophy)

| Law | Meaning |
|-----|---------|
| **One Intent** | User states one intent (“오사카 4박 5일”, “대리 뛸게”) |
| **One Workspace** | Rimvio prepares **one** matching Workspace (resources ready) |
| **One Focus** | Screen shows **only** the current next action — large Primary Focus |

```
Intent
  → Workspace (behind: full slot rail + tools)
  → Focus step ① only on screen
  → complete → Focus step ②
  → … → Reality Commit when needed
```

## Primary Focus surface (first paint)

```
┌─────────────────────────┐
│  현재 작업                │
│  호텔 선택                │
│  ─────────────────       │
│  호텔 카드들              │
│  ─────────────────       │
│  AI: 이 호텔이 가장…      │
└─────────────────────────┘
```

**Forbidden on that paint:** 맛집 · 환율 · 날씨 · 쇼핑 · 항공 전체 UI · multi-panel dashboards.

## Ghost rail (behind, one line each)

| State | Line |
|-------|------|
| done | ✓ 항공 완료 |
| waiting | 맛집 · 대기 |
| background | 예산 · 자동 계산 중 |

Ghost rows are **not** interactive walls of cards. One line. Expand only on tap → that row becomes the new One Focus.

## Cursor isomorphism

Cursor shows **one file** in focus; tabs/search/agent stay available but not all open.  
Rimvio shows **one Focus step**; other Workspace slots stay as ghost lines.

## Reject in review

- Opening a Workspace and painting **all** slots as equal cards  
- First paint with ≥2 competing Primary CTAs  
- Chat essay that lists flight+hotel+food+weather as the answer  
- “Dashboard Workspace” as default home inside a kind  
- New WorkspaceKind without an ordered `focusSequence`

## Stack / Field alignment

- `/stack` 1장 · Jobs L0 «One thing at a time» = same law  
- Field yes-one-answer buttons = Focus when Intent already narrowed  
- Globe chat creates Intent/Workspace; **inside Workspace, Focus replaces chat dump**
