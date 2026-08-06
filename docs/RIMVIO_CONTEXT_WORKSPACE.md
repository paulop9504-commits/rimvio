# Rimvio Context Workspace — Definition

**Status:** locked 2026-08  
**Audience:** humans · LLM prompts · PR review  
**ADR:** [`adr/022-context-workspace-first.md`](./adr/022-context-workspace-first.md) · One Focus [`adr/025-one-intent-workspace-focus.md`](./adr/025-one-intent-workspace-focus.md)  
**Wire:** `lib/context-workspace/` · `components/context-workspace/` · `components/mobile-workspace/`  
**Kernel:** Article 0 — Reality never mutates without explicit Commit

> This is the **product definition** of Context Workspace.  
> Not Cursor’s IDE folder. Not Google Workspace. Not a chat thread.

---

## Workspace의 정의

Rimvio의 **Context Workspace**는 일반적인 Workspace가 아니다.

Workspace는

- 채팅방도 아니고,
- Google Workspace도 아니고,
- IDE의 프로젝트 폴더도 아니고,
- 위젯을 모아놓은 대시보드도 아니다.

**Rimvio Workspace는 Reality를 변경하기 전에 작업하는 공간(Reality Draft)이다.**

한 개의 Intent를 해결하기 위한 임시 작업장이며, 사용자가 승인(Commit)하기 전까지 Reality는 절대 변경되지 않는다.

---

## 한 줄 정의

> **Workspace = Reality를 고치기 전의 작업장. (Cursor의 Editor와 같은 역할)**

또는

> **Chat은 말을 거는 곳, Workspace는 일이 쌓이는 곳.**

유저 카피(L1): **작업장** · 여행/맥락 이름 (예: Osaka Trip).  
제품 명사(L2): **Context Workspace** · **Reality Draft**.

---

## Rimvio Workspace란

Workspace는 하나의 Intent만 담당한다. (ADR-025)

```text
Osaka Trip
    ↓
하나의 Workspace 생성
```

이 Workspace 안에서

- 호텔
- 맛집
- 일정
- 예약
- 사진
- 이동 동선
- 예산
- 비교 결과

등이 모두 **하나의 Reality Draft**로 관리된다.

**Workspace가 SSOT**이며, Chat은 아니다.

---

## Workspace ≠ Chat

Chat은 Intent를 전달하는 입력창이다.

```text
"오사카 4박5일 일정 짜줘."
```

는 작업을 시작하는 신호일 뿐이다.

실제 작업은 Workspace에서 이루어진다.

- Chat은 작업 로그만 남긴다. (1줄 status / work log)
- Workspace는 변경 사항(Patch)을 저장한다.

---

## Workspace ≠ File System

Cursor는 파일을 수정한다.

```text
Project → Files → Diff → Commit
```

Rimvio는 현실 객체를 수정한다.

```text
Reality
  → Hotels · Restaurants · Flights · Schedules · …
  → Workspace Draft
  → Reality Commit
```

파일 대신 **Reality Object**를 관리한다.

---

## Cursor와 Rimvio의 대응 관계

| Cursor | Rimvio |
|--------|--------|
| Project | Context Workspace |
| File | Reality Object |
| Folder | Map / Context (폴더 트리 UI 금지) |
| Editor | Workspace |
| Diff | Workspace Patch |
| Git Commit | Reality Commit |
| Terminal | Agent Runtime |
| Status Bar | Workspace Status |
| Chat | Intent entry + work log (not SSOT) |

Cursor가 프로젝트를 편집하듯, Rimvio는 **Reality를 편집**한다.

---

## Workspace의 내부 구조

Workspace는 항상 하나의 Agent가 관리한다.

```text
Intent
  → Agent Loop
  → Workspace Patch (SSOT)
  → Projection
       → Map
       → Callout
       → Bottom Sheet / Place Panel
       → Status
  → (Human) Commit
```

모든 UI는 Workspace Patch를 **렌더링**할 뿐이다.  
각 화면이 따로 판단·Invent 하지 않는다. (Dual surface · ADR-048)

---

## Chat의 역할

Chat / Globe·Workspace Command는 **Intent만** 입력한다.

예:

- 오사카 맛집 찾아줘.
- 마지막 날 여기 예약해.
- 더 싼 호텔로 바꿔.

Chat은 절대로 SSOT가 아니다.

---

## Workspace의 역할

Workspace는 Reality Draft를 관리한다.

예:

```text
Osaka Trip

Before
  Day4 Dinner — 없음

After
  Harijyu
  Budget +8000 JPY
  Travel Time 17 min
```

Workspace는 항상 **현재 변경 사항(Patch)** 을 가지고 있다.

---

## Callout의 역할

Callout은 상세 정보창이 아니다.

Callout은 **Object Diff Viewer**이다.

```text
Harijyu
AI Analysis
  ✓ 일정 적합
  ✓ 이동거리
  ✓ 예산 영향
Actions
  예약 준비 · 비교 · 일정 추가
```

선택한 Object가 Workspace를 어떻게 변경하는지(Evidence · Impact)를 보여준다.  
검색 결과 카드 벽 · multi inventory floating windows(모바일) 금지.

---

## Map의 역할

Map은 Workspace의 **시각화**이다.

- 핀 = Reality Object
- 색상·상태 = Workspace Patch / focus 표현
- **Anchor** = Intent의 기준 Reality Object (예: USJ) — 주변 숙소·맛집은 Anchor에 **연결된** Object

Map 자체가 데이터를 만들지 않는다. (Projection only)

상세 런타임 · USJ 예시 · PR reject: **[`RIMVIO_REALITY_ANCHOR_PROJECTION.md`](./RIMVIO_REALITY_ANCHOR_PROJECTION.md)**

---

## Bottom Sheet / Place Panel의 역할

선택한 Object의 작업 표면이다.

Workspace Patch · Intent-adaptive facets를 **그대로 렌더링**한다.  
새로운 판단을 하지 않는다. (Same facts as Callout)

---

## Status의 역할

Status는 Agent Runtime을 보여준다.

예:

```text
Searching restaurants...
Comparing candidates...
Preparing reservation...
Waiting for approval...
Committed.
```

장문 Chat essay 대신 **현재 작업 상태 1줄**을 알려준다.

---

## Commit 원칙

Workspace는 Reality가 아니다.

항상 다음 순서를 유지한다.

```text
Intent
  → Workspace Draft
  → Workspace Patch
  → Approval
  → Reality Commit
```

- AI는 **Prepare**까지만 수행한다.
- Reality를 변경하는 **Commit은 반드시 사용자**가 승인한다. (Article 0)

---

## LLM이 반드시 이해해야 할 규칙

```text
Workspace ≠ Chat.
Workspace ≠ Google Workspace.
Workspace ≠ IDE Project folder.
Workspace = Map-backed Reality Draft until Commit.

Chat is only the Intent entry.
Workspace is the SSOT.
Projection is rendered from Workspace Patch.
AI prepares Reality.
Human commits Reality.

Do not answer as a chat essay.
Emit / describe Workspace Patch · Callout Diff · one-line Status.
```

---

## Rimvio의 한 줄 비유

> **Cursor가 코드(Project)를 편집한다면, Rimvio는 현실(Reality)을 편집한다.**

파일 대신 호텔, 맛집, 일정, 사진, 예약 같은 Reality Object를 Workspace에서 수정하고, 사용자의 승인 후에만 실제 Reality에 Commit한다.

이것이 Rimvio Context Workspace의 핵심 개념이다.

---

## Related

| Doc | Role |
|-----|------|
| ADR-022 | Context Workspace first (IDE isomorphism) |
| ADR-025 | One Intent → One Workspace → One Focus |
| ADR-048 / Agent Operating Constitution | Clear/Soft Intent · Dual surface |
| [`RIMVIO_CONSTITUTION_LAYER.md`](./RIMVIO_CONSTITUTION_LAYER.md) § Workspace · Commit · Interface | Policy index |
| [`RIMVIO_REALITY_OS.md`](./RIMVIO_REALITY_OS.md) | Globe → Context → Workspace → Entity |
