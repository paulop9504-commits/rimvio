# ADR-035: RIMVIO Command — single Command Interface

**Status:** accepted 2026-07  
**Wire:** `lib/rimvio-command/` · Globe ingest · Context PinBar · Workspace prompt  
**Related:** ADR-028 · ADR-029 · ADR-031 · ADR-034 · Article 0 · UX Constitution

## One sentence

> **RIMVIO Command**는 사용자 명령을 현실 Context로 변환하는 OS 입력면이다.  
> AI Assistant / 챗봇 제품 명사는 폐기한다.

## Stack (user-visible)

```
Globe
  ↓
Context
  ↓
Command   ← 항상 하나 (문구·위치만 바인딩)
  ↓
Agent (숨김: Architect · Operator · Worker)
  ↓
Reality Commit
```

## Command Intelligence

```
Text | Image | Voice
        ↓
Intent Understanding
        ↓
Context Router → Create | Continue | Execute
        ↓
Agent System → 상태 변경 → (승인 후) Commit
```

| Mode | Meaning | Internal |
|------|---------|----------|
| **Create** | 새 현실 프로젝트 | Globe AI Architect (숨김) |
| **Continue** | 열린 Context 진행 | Context AI Operator (메인) |
| **Execute** | 도메인 실행·준비 | Domain Agent Worker (숨김) |

## Single Command Bar

| Surface | Placeholder | Mode bias |
|---------|-------------|-----------|
| Globe (no active Context) | 무엇을 만들까요? | Create |
| Open Context | 무엇을 할까요? | Continue / Execute |
| Workspace 2D | 무엇이든 물어보세요 | Continue (same component contract) |

**One component family** — do not ship parallel “AI windows” as product nouns  
(숙소 Ask · Portal · Action Chat 말입력은 Command ingress로 흡수).

## Product law

| Do | Don’t |
|----|-------|
| 명령 → Context 판단 → 상태 → Commit | 대화 → 장문 답변 SSOT |
| Globe AI 숨기고 Create만 라우트 | Globe에서 “AI 도우미”로 계획 essay |
| Context 카드 + 핀이 프로젝트 | AI 종류 고르기 UI |
| 사진 → 이 맥락 / 새 맥락 | 자동 병합 |

## Action Ontology (4-step pipe)

```
1. classifyActionVerb(utterance)   → ActionVerb (14)
2. resolveCommandTarget(verb,state) → CommandTarget (5)
3. resolveIntentFromActionVerb     → IntentFamily (20)
4. routeRimvioCommandMode          → Create | Continue | Execute
```

### 14 ActionVerbs

| Verb | 대표 동사 | 하위 IntentFamily |
|---|---|---|
| `create` | 만들어줘 · 짜줘 · 계획해줘 | Create |
| `search` | 찾아줘 · 추천해줘 · 보여줘 | Search, Filter |
| `move` | 이동해줘 · 옮겨줘 · 안내해줘 | Move, Navigate |
| `book` | 예약해줘 · 잡아줘 · 구매해줘 | Reserve, Purchase |
| `prepare` | 준비해줘 · 챙겨줘 · 세팅해줘 | Prepare |
| `edit` | 바꿔줘 · 수정해줘 · 추가해줘 | Revise, Delete |
| `decision` | 비교해줘 · 골라줘 | Compare, Analyze |
| `analyze` | 분석해줘 · 예상해줘 · 계산해줘 | Analyze, Predict, Simulate |
| `memory` | 저장해줘 · 기억해줘 · 기록해줘 | Pin, Note, Highlight |
| `resume` | 이어줘 · 계속해줘 · 불러와줘 | (Continue mode) |
| `share` | 공유해줘 · 보내줘 · 초대해줘 | Share |
| `action` | 실행해줘 · 진행해줘 · 적용해줘 | (Execute mode) |
| `cancel` | 취소해줘 · 되돌려줘 · 빼줘 | Delete, Undo |
| `auto` | 알아서 해줘 · 맡길게 | (Delegation) |

### 5 Command Targets (state-aware)

| Target | 조건 | 예시 |
|---|---|---|
| `new_context` | Globe / 주제 불일치 | "제주도 여행 만들어줘" |
| `current_context` | Context 열림 | "맛집 찾아줘" (오사카 Context 안) |
| `current_workspace` | Workspace 활성 | "더 싼 걸로 바꿔줘" (호텔 선택 중) |
| `selected_artifact` | Artifact 선택 중 | "하루 더 늘려줘" (일정표 보는 중) |
| `external_reality` | 예약/실행 | "이 호텔 예약해줘" |

### 질문 줄이기 규칙

```
Bad UX:  "호텔 찾아줘" → "어느 여행인지 알려주세요."
Good UX: "호텔 찾아줘" → "현재 열려있는 제주 여행 기준으로 호텔 찾아볼게요."
```

Target Resolver가 현재 상태를 읽어서 자동으로 `current_context`를 결정.
주제가 완전히 다르면 `new_context` 칩 제안 (강제 spawn 아님).

## Wire SSOT

| Concern | Path |
|---------|------|
| ActionVerb classifier | `lib/rimvio-command/action-verb.ts` |
| Target resolver | `lib/rimvio-command/resolve-command-target.ts` |
| Verb→Intent map | `lib/rimvio-command/action-verb-to-intent.ts` |
| Mode router | `lib/rimvio-command/route-command-mode.ts` |
| Placeholder | `lib/rimvio-command/resolve-command-placeholder.ts` |
| Spawn | `shouldSpawnNewContext` (ADR-029) — Create vs attach |
| Command ops | ADR-028 migrate / clone / save → Continue |
| Commit | Article 0 · Field |

## PR reject

- 「AI Assistant」「챗봇」 onboarding / hero  
- Separate branded AI bars (숙소 가이드 AI, Portal AI, …) as peer products  
- Globe compose answering full itinerary without opening Context  
- Duplicate Command components per surface without shared router  
- Commit without human approval  

## Ship notes

1. ADR + `lib/rimvio-command` classifier + placeholders  
2. Wire PinBar / ingest copy to shared placeholders  
3. Absorb lodging ask / portal into Command modes progressively  
4. Capture ＋ remains media ingress; spoken intent → Command  
