# Glango 제품 정의서 (Product Brief)

> **대상:** PM, 디자이너, 마케팅, 다음 AI 에이전트
>
> **관련 문서:** [GLANGO_HANDOFF.md](./GLANGO_HANDOFF.md) — 기술/코드 핸드오프
>
> **제품명:** Glango 👀
>
> **태그라인:** Link-to-Action Operating Layer — *공유 한 번, 다음 행동 한 탭*

---

## 1. Glango가 무엇인가

### 한 줄 정의

**Glango는 북마크 앱이 아니다.** 사용자가 어디서든 링크를 공유하면, Glango가 그 링크를 **지금 당장 누를 수 있는 행동 버튼**으로 바꿔 주는 OS 레이어다.

### Glango가 **아닌** 것

| ❌ 아님 | ✅ Glango |
|---------|----------|
| Pocket / Raindrop (링크 모음) | 링크 → **행동** 변환 |
| Notion inbox (읽을 거리 쌓기) | **1–2탭**으로 실행 |
| AI 요약 앱 (긴 글 읽게 함) | **벽 of text 금지**, 버튼만 |
| 브라우저 확장 | **모바일 Share Target** 중심 PWA |

### 핵심 가치

```
공유 → 3초 → "다음에 뭘 하면 되지?"가 버튼으로 보임
```

사용자는 링크를 "나중에 볼 목록"에 넣는 게 아니라, **다음 행동을 즉시 실행하거나, Stack에 넘겨** 나중에 Feed에서 다시 만난다.

---

## 2. 해결하는 문제

### 사용자 pain

1. **링크를 저장해도 다시 안 연다** — 북마크 = 무덤
2. **공유받은 링크를 열면 설명란·댓글·광고** — 원하는 행동까지 스크롤 지옥
3. **YouTube·쇼핑·지도·카톡방** — 사이트마다 "뭘 해야 하는지"가 다름
4. **inbox 죄책감** — 쌓인 목록을 보면 부담

### Glango의 답

| Pain | Glango UX |
|------|----------|
| 뭘 해야 할지 모름 | Top 1 **Primary Action** giant pill |
| 나중에 까먹음 | Share 직후 `/now`에서 즉시 행동 or Stack |
| 목록 스크롤 피로 | Feed는 Shorts처럼 **한 장씩** |
| 사이트마다 다름 | **Enricher**가 도메인별 버튼 생성 |
| 죄책감 | "그냥 Stack에 두기 (Done)" — 부담 없이 넘기기 |

---

## 3. 타겟 사용자 & 사용 시나리오

### Primary persona

**바쁜 모바일 유저** — 카톡·인스타·유튜브·쇼핑몰에서 링크를 자주 받거나 저장하지만, "나중에"가 "안 함"으로 이어지는 사람.

### 대표 시나리오 (v1 데모 기준)

| # | 상황 | 공유 링크 | Glango가 보여주는 Top 1 |
|---|------|-----------|------------------------|
| 1 | 친구가 여행 숙소 유튜브 공유 | YouTube | ▶️ 영상 바로 재생 |
| 2 | 호텔 위치 네이버 지도 | map.naver.com | 카카오맵 바로 열기 *(카카오맵 설치 시)* |
| 3 | 요고 타임딜 링크 | yo-go.co.kr | 🛒 타임딜 열기 |
| 4 | 디자인 핸드오프 | Figma | Open in Figma |
| 5 | 스프린트 승인 이슈 | Linear | Open issue |
| 6 | 만료된 문서 | Stripe docs | Archive로 이동 |

### 30초 Jobs 데모 스크립트

```
1. 유튜브에서 "공유" → Glango 선택
2. "👀 블링크가 다음 행동을 찾는 중..." (shimmer, spinner 없음)
3. /now — 제목 + ▶️ 영상 바로 재생 (거대 glass pill)
4. 탭 → 영상 재생 + Feed로
5. Feed에서 ↑↓ 스와이프로 다른 링크 탐색
```

---

## 4. 제품 어휘 (Vocabulary)

내부·외부 커뮤니케이션에 쓰는 용어. **유저-facing copy에는 infra 용어 노출 금지.**

| 용어 | 의미 | 유저에게 보이나? |
|------|------|------------------|
| **Action** | 링크에서 추출한 실행 가능한 버튼 1개 | ✅ (버튼 라벨) |
| **Primary Action** | actions[0], Top 1 히어로 버튼 | ✅ |
| **Secondary Action** | actions[1~3], 작은 pill | ✅ |
| **Now** | Share 직후 1회성 Action sheet | ❌ (화면만) |
| **Feed** | 홈 Shorts 스타일 세로 스와이프 | ✅ "Feed" |
| **Stack** | 맨 위 1장 focus + ghost stack (legacy UX) | ✅ "Stack" |
| **Done** | Primary 안 눌러도 Stack/Feed에 저장 | ✅ "그냥 Stack에 두기" |
| **Archive** | 만료·완료 링크 보관 | ✅ "👀 보관함" |
| **Enricher** | URL → actions 변환기 | ❌ |
| **Action Bridge** | 버튼 탭 → 외부 앱/deep link 실행 | ❌ |

### 브랜드 톤

- 이모지: 👀 (Glango 정체성), ▶️ 🛒 🎁 등 action 라벨에 sparingly
- 톤: 짧고 확신 있게. "찾는 중...", "All clear", "Demo 채우기 →"
- **한국어 UI** (영문 action 라벨은 데모 샘플에만 일부)

---

## 5. 화면별 제품 스펙

### 5.1 Feed `/` — 홈

**역할:** 저장된 링크를 Shorts처럼 **한 장씩** 넘기며 Primary Action 실행.

**UX:**
- 전체 viewport snap scroll (↑↓ 스와이프)
- 오른쪽 dot indicator
- 큰 hero visual (썸네일 or 도메인 gradient)
- 풀-width Primary pill + horizontal secondary pills
- 빈 상태: 👀 "All clear" + Demo 링크

**디자인 원칙:** scroll guilt 없음 — 한 장에 집중, inbox급 리스트 아님.

---

### 5.2 Now `/now` — Share 직후

**역할:** 공유 직후 **가장 중요한 행동 1개**만 크게 보여준다. inbox로 던지지 않음.

**UX:**
- 로딩: shimmer + "👀 블링크가 다음 행동을 찾는 중..."
- 중앙 hero thumbnail (YouTube는 빨간 gradient ▶)
- 제목 + 도메인
- **Giant glass pill** — Primary Action (YouTube는 red tint)
- Secondary pills (최대 3)
- 하단: "그냥 Stack에 두기 (Done)" — Primary skip해도 저장

**행동 후:** background persist → Feed `/` redirect

**측정:** impression / click / skip → intent bin 학습

---

### 5.3 Share `/share` — invisible bridge

**역할:** PWA Share Target 진입점. **화면 없음** (null render).

**UX:**
- toast: "👀 블링크가 다음 행동을 찾는 중..."
- 즉시 `/now?url=...` redirect
- 실패 시 toast error → 홈

---

### 5.4 Stack `/stack`

**역할:** 초기 MVP UX. 맨 위 링크 1장만 선명 + 아래 ghost stack.

**현재 위치:** Feed가 홈이 됐으므로 **secondary surface**. Demo·비교용으로 유지.

---

### 5.5 Inbox `/inbox`

**역할:** 전체 링크 **카드 리스트** (secondary, deep link).

**언제 쓰나:** "전부 보고 싶을 때" — 홈 Feed의 hidden layer.

---

### 5.6 Archive `/archive`

**역할:** `expires_at` 지난 링크 보관.

**UX:** 👀 보관함 — 실행은 가능하지만 active Feed에서 제외.

---

### 5.7 Demo `/demo`

**역할:** 개발·투자 데모용 샘플 6개 시드 + 화면 프리뷰 링크.

**샘플 구성:** YouTube, Naver Map, yo-go, Figma, Linear, expired Stripe.

---

## 6. 핵심 사용자 여정

### Journey A — Share & Act (happy path)

```mermaid
flowchart LR
  A[외부 앱 공유] --> B[/share bridge]
  B --> C[/now enrich]
  C --> D{Primary tap?}
  D -->|Yes| E[외부 앱 실행]
  D -->|Done| F[Stack 저장]
  E --> F
  F --> G[Feed 홈]
```

### Journey B — Feed browse

```
Feed 열기 → 첫 장 Primary tap or 스와이프 → 다음 링크
→ 만료된 건 Archive에서만
```

### Journey C — Context-aware action

```
출퇴근 시간(commute) + 카카오맵 설치
→ 지도 링크의 Top 1이 "카카오맵 바로 열기"로 boost
```

---

## 7. Enrichment — 제품 관점

링크를 **읽을 거리**가 아니라 **누를 거리**로 바꾸는 Glango의 핵심 엔진.

### 3층 파이프라인 (유저 invisible)

```
Generic   →  title, image, description, URL 추출
Domain    →  YouTube / commerce / kakao 등 특화 actions
Intent    →  시간·앱 설치·과거 tap 패턴으로 순서 미세 조정
```

### 도메인별 기대 UX

| 도메인 | Phase | Top 1 예시 | Secondary 예시 |
|--------|-------|------------|----------------|
| **Any URL** | ✅ 1 | 원본 열기 | description 속 URL들 |
| **YouTube** | ✅ 2 | ▶️ 영상 바로 재생 | ⏱ 1:23 구간 재생, 링크 |
| **Naver Map** | ✅ 1+context | 카카오맵 바로 열기 | 원본 열기 |
| **yo-go 등 commerce** | 🔜 3 | 🛒 타임딜 열기 | 🎁 플친 쿠폰 |
| **Kakao open chat** | 🔜 3 | 💬 알림방 입장 | — |
| **Unknown** | 🔜 4 AI | AI가 facts+actions JSON | fallback |

### 제품 규칙 (헌법)

1. **최대 5 actions** — 넘으면 priority 낮은 것 숨김
2. **설명란 전문 노출 금지** — UI는 actions만
3. **YouTube Top 1은 항상 "영상 재생"** — intent rank로 밀리지 않음
4. **spinner 금지** — shimmer만
5. **Optimistic** — 공유 즉시 카드, enrich는 백그라운드

---

## 8. 개인화 (Intent v1)

### 철학

과도한 ML 없이, **coarse context bin + tap stats**로 Top action 순서를 살짝 조정.

Quant 투자자 관점 비유 (창시자 컨셉):
- **Context bin** ≈ ROE bin (출퇴근/야간 × 설치 앱)
- **CTR** ≈ 수익률 (좋은 action)
- **Skip rate** ≈ MDD (안 맞는 action)

### Context bin (~6 combos)

```
day | night | commute  ×  default | kakaomap
예: "commute|kakaomap", "day|default"
```

### 학습 규칙

- `/now`에서 impression / click / skip 기록
- impressions ≥ 8일 때만 reorder boost
- sample 적으면 rule-based fallback (commute → kakaomap 우선)

### 미래 (L5)

- 로그인 후 per-user bin
- AI가 preference + history로 Top 1 선정
- raw HTML은 AI에 넣지 않음 — facts/actions만

---

## 9. 로드맵 (제품 Phase)

| Phase | 제품 목표 | 유저 체감 | 상태 |
|-------|-----------|-----------|------|
| **0** | PWA + Share + Now + Feed | "공유하면 버튼이 뜬다" | ✅ MVP |
| **1** | Generic enricher | "링크 3개가 버튼으로!" | ✅ |
| **2** | YouTube enricher | "▶️ 영상 바로 재생!" | ✅ (메타 품질 개선 필요) |
| **2.5** | Intent bins v1 | "출퇴근에 카카오맵이 먼저" | ✅ |
| **3** | Commerce + Kakao enricher | "타임딜·오픈채팅 원탭" | 🔜 |
| **4** | Android PWA install + real Share | "진짜 폰에서 공유" | 🔜 killer demo |
| **5** | Auth + per-user AI intent | "나한테 맞는 Top 1" | 🔜 |

### 다음 우선순위 (합의됨)

1. Android PWA + 실제 Share Target 데모
2. YouTube oEmbed — Feed 썸네일·제목 품질
3. Share → Feed top pin (방금 공유한 링크 맨 위)
4. commerce / kakao enricher
5. PWA 192/512 아이콘

---

## 10. 경쟁 포지셔닝

```
                    실행력 (Action)
                         ↑
                    Glango 👀
                         |
    Pocket · Raindrop ---+--- AI Reader (요약)
                         |
                         ↓
                    저장력 (Archive)
```

**Glango moat:** Share Target 진입 + domain enricher network + intent bin 누적 데이터.

---

## 11. 성공 지표 (제안)

| Metric | 의미 |
|--------|------|
| **Share → Primary click rate** | enrich 품질 |
| **Share → Done (skip) rate** | Top 1 relevance (낮을수록 좋음) |
| **Feed swipe depth** | engagement |
| **D7 re-open** | 북마크 무덤이 아닌지 |
| **Time to first action** | Share → tap (목표 < 5초) |

---

## 12. UI Copy 레퍼런스

| 상황 | Copy |
|------|------|
| Share bridge toast | 👀 블링크가 다음 행동을 찾는 중... |
| Now loading | 👀 블링크가 다음 행동을 찾는 중... |
| Now Done | 그냥 Stack에 두기 (Done) |
| Feed empty | All clear / Share a link — swipe up to browse actions. |
| Feed empty CTA | Demo 채우기 → |
| Archive link | 👀 보관함 N개 |
| Copy success | 링크 복사됨 |
| Share error | 공유된 링크를 찾지 못했어요. |
| Enrich error | 다음 행동을 찾지 못했어요. |

### Action 라벨 패턴

```
▶️ 영상 바로 재생
⏱ 1:23 구간 재생
카카오맵 바로 열기
원본 열기
🛒 타임딜 열기
🎁 플친 쿠폰
🔗 {hostname}
```

---

## 13. 제품 진화 히스토리

```
Silent Ghost  →  Glango 👀
(개발 codename)   (consumer brand)

Stack 홈  →  Shorts Feed 홈
/inbox hidden  →  /stack 으로 Stack UX 이동
```

**현재 홈:** `/` = Feed (Shorts-style)
**Stack UX:** `/stack` (legacy, demo용 유지)

---

## 14. 다른 AI에게 — 제품 작업 시 체크

작업 전 확인:

1. **1–2 Tap Rule** 위반하지 않았나? (3개 이상 primary 금지)
2. **벽 of text** 넣지 않았나?
3. **Share → Now** 우회하지 않았나?
4. **spinner** 쓰지 않았나?
5. 새 도메인 = **enricher 추가**, 카드 UI 복제 금지
6. UI copy **한국어** 유지
7. `/` = Feed가 홈 (Stack 아님)

---

*마지막 업데이트: 2026-05-25*
