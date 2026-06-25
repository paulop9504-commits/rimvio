# Rimvio Context AI Response System

> **Canonical.** Ask sheet (`CaptureSheet`) · Guardian scope on **내 지구**.  
> **Related:** [RIMVIO_PERSONAL_CONTEXT_AI.md](./RIMVIO_PERSONAL_CONTEXT_AI.md) · [RIMVIO_SCOPE_AI.md](./RIMVIO_SCOPE_AI.md)

---

## Role

Rimvio AI is not a generic chatbot. It is **Personal Context Intelligence**:

search stored context → explain it in human narrative → show operable context cards.

---

## Response order

```text
User question
  → context retrieval (EventCandidate / Bridge)
  → AI narrative (deterministic, fact-only)
  → context cards (title · people · place · period · photos · dwell)
```

Never list search hits alone. Never show raw data without explanation.

The AI must first sound like it understood the memory — short, natural, friend-like.

---

## Output structure

### 1. AI narrative

Multi-paragraph summary from **retrieved facts only**.

Example:

```text
정성과 함께한 상하이 여행을 찾았어요.

2025년 1월에 3일 동안 상하이에 머물렀고,
와이탄과 동방명주를 방문했네요.

당시 촬영한 사진은 총 42장입니다.
```

Code: `lib/personal-context-ask/build-context-ai-narrative.ts`

### 2. Related context cards

Per bridge:

- Title · participants · place · date · photo count · dwell
- Actions: **사진 보기** · **지도에서 보기** · **브릿지 열기**
- Photo preview grid (up to 4) when captures exist

---

## Multiple bridges

Narrative first summarizes the **pattern**, then highlights the richest bridge (most photos / latest).

Example:

```text
정성과 함께한 상하이 관련 맥락 3개를 찾았어요.

여행 2건과 출장 1건이 확인됩니다.

가장 사진이 많은 여행은 2025년 상하이 여행입니다.
```

---

## Hard rules

| Rule | Meaning |
|------|---------|
| No hallucination | Only fields from retrieval + enrich |
| No guess | Empty state when no hits |
| No search-engine tone | Human memory restoration |
| L1 copy | `lib/copy/human-ko.ts` → `globe.askSheet.*` |

---

## Stack

```text
Intent + entities (person · place · time · target)
  → resolveBridgeContextSearch (SSOT when person+place anchored)
  → enrichBridgeContextFacts · collectBridgeMediaForAsk
  → buildContextAiNarrative (responseFocus: photos | when | activity)
  → PersonalContextAskReply
```

Photo/video keywords set `target: photo` only — **never** a separate photo DB search.

---

## Goal

User reaction target:

> "와, 이 AI는 내 삶을 기억하고 있네"

Core: **Context Retrieval + Context Understanding + Human Narrative**
