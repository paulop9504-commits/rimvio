# Rimvio External Globe AI

> **Canonical.** 밖 지구 · Explorer scope · Opportunity & Achievement Intelligence.  
> **Related:** [RIMVIO_SCOPE_AI.md](./RIMVIO_SCOPE_AI.md) · [RIMVIO_PERSONAL_CONTEXT_AI.md](./RIMVIO_PERSONAL_CONTEXT_AI.md) · [RIMVIO_CONTEXT_AI_RESPONSE.md](./RIMVIO_CONTEXT_AI_RESPONSE.md) · [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md)

---

## Thesis

External Globe AI is **not** a search engine.

It is an **Opportunity & Achievement Intelligence System** that discovers and connects, across countless **public Bridges (Context)**:

- people
- opportunities
- resources
- experiences

…so the user can **execute and achieve** — not scroll lists.

| Personal Globe AI | External Globe AI |
|-------------------|-------------------|
| "나를 이해한다" | "세상의 기회를 발견한다" |
| Memory Intelligence | Opportunity Intelligence |
| Guardian | Explorer → Achievement |

**Action layer:** "실행과 성취를 만든다."

> Understand Your Life. Discover Opportunities. Drive Achievement.

---

## Mission

Understand what the user wants.

Among countless **public** contexts in the world, find and connect:

- the right **people**
- the right **opportunities**
- the right **actions**

---

## Vision

Users do not want search. Users want to **achieve**:

- meet friends · travel · buy · sell · exercise · build projects

External Globe AI does **not** show information — it connects **action and achievement**.

---

## Public Context Network

External Globe is a network of **public Bridges**.

| Bridge type | Examples |
|-------------|----------|
| Travel | 여행 모집 · trip overlay |
| Gathering | 모임 · 번개 |
| Trade | 맞춤 · 중고 · 거래 |
| Project | 프로젝트 · 협업 |
| Event | 행사 |
| Community | 지역 커뮤니티 |
| Sports | 스포츠 · 운동 |
| Business | 비즈니스 |
| Study | 스터디 |

AI understands all public activity as **Bridge (Context)** units — same spine as internal `EventCandidate`, **external visibility**.

---

## Core principle

| Forbidden | Required |
|-----------|----------|
| Search result lists | Why this context fits |
| Feed / post dumps | Context summary |
| Ranking tables as hero | **Immediate operable connection** |

Never list results alone. Always explain → summarize → **action**.

---

## Internal signal usage (hard law)

External AI may use **anonymized profile projections** from Personal Globe only:

- interests · activity tendency · preferred regions · preferred times
- participation patterns · recent activity (aggregated)

| Never use |
|-----------|
| Raw photos · raw messages · raw location traces · PII |

See [RIMVIO_PERSONAL_VAULT.md](./RIMVIO_PERSONAL_VAULT.md) · constitution truth/projection law.

---

## Processing flow

```text
User intent
  → intent analysis
  → entity extraction (who · where · when · goal)
  → public bridge discovery
  → opportunity scoring
  → context ranking
  → action recommendation
  → achievement tracking
```

Code direction (partial today):

| Stage | Path |
|-------|------|
| Discovery ingress | `lib/context-resolver/discovery/` |
| Market / alignment | `lib/globe/market/` · `app/api/globe/market-*` |
| External pins | `lib/globe/market/project-market-discovery-pins.ts` |
| Scope persona | `lib/scope-ai/` · Explorer |
| Ask sheet (밖 지구) | `lib/personal-context-ask/` · `scope: discovery` |

---

## AI objective

When the user asks *"what should I do?"* — connect **who · where · how**, not links.

### Example — weekend

**User:** 이번 주말 뭐하지?

**AI:** 최근 야외활동과 여행 관련 맥락이 많네요. 이번 주말 참여 가능한 공개 맥락을 발견했습니다.

1. 가평 캠핑 모임  
2. 양평 차박 번개  
3. 홍천 트레킹 모임  

가장 적합한 모임은 가평 캠핑 모임입니다.

`[참여하기]` `[대화하기]` `[브릿지 열기]`

### Example — travel buddy

**User:** 제주도 같이 갈 사람 찾아줘

**AI:** 제주 여행 모집 중인 공개 브릿지 12개를 발견했습니다. 참여율·활동량 기준 가장 활발한 그룹을 추천합니다.

`[참여 요청]` `[대화하기]` `[브릿지 보기]`

### Example — sell

**User:** 아이폰 팔고 싶어

**AI:** 거래 가능성이 높은 맞춤 맥락 14건. 거리·관심도 기준 가장 빠른 거래 후보를 추천합니다.

`[대화하기]` `[거래 예약]`

### Example — study

**User:** 영어 공부하고 싶어

**AI:** 근처 영어 스터디 맥락 6개. 일정에 가장 잘 맞는 모임: 수요일 저녁 강남 영어 스터디.

`[참여하기]` `[대화하기]`

---

## Output rules

Always in order:

1. **Recommend reason** — why this fits (from retrieved facts)
2. **Context summary** — bridge card(s)
3. **Action buttons** — one-tap next step

Same response law as [RIMVIO_CONTEXT_AI_RESPONSE.md](./RIMVIO_CONTEXT_AI_RESPONSE.md) — narrative before cards, never raw lists.

---

## Action first

Discovery without action is **failure**.

Every recommendation must lead to:

| CTA | Use |
|-----|-----|
| 참여하기 | gathering · study · travel join |
| 대화하기 | alignment DM · handshake thread |
| 예약하기 | schedule · booking |
| 거래하기 | market handshake |
| 지원하기 | project · role apply |
| 브릿지 생성 | user publishes public bridge |

Globe ask sheet CTAs (today): `viewPhotos` · `viewMap` · `openBridge` on internal; external Phase B+ mirrors with join · chat · bridge.

---

## Achievement layer

```text
Want
  → opportunity discovery
  → participate
  → execute
  → achieve
```

Telemetry + fold gate feed ranking — see Action OS spine; **no** separate achievement UI until vertical slice ships.

---

## Phase roadmap

| Phase | Scope |
|-------|-------|
| **A** (now) | Doctrine · scope gate · market alignment · discovery pins read |
| **B** | 밖 지구 ask sheet — public bridge retrieval + opportunity narrative |
| **C** | Anonymized profile scoring · achievement tracking loop |

Personal ask sheet on `scope: discovery` returns external-soon stub until Phase B.

---

## PR reject

- Search-engine / list-hero UX on external globe
- Raw personal data in external retrieval
- Mixing internal recall with external opportunity on one answer
- Recommendations without operable CTA
- 「게시」「업로드」「좋아요」 framing — [story layer](../.cursor/rules/rimvio-story-layer.mdc)
