# Blink 프로젝트 핸드오프 (AI / 개발자용)

> **목적:** 이 문서만 읽고도 Blink 코드베이스의 구조, 흐름, 규칙, 미완성 항목을 파악할 수 있게 한다.
>
> **프로젝트 경로:** `c:\Users\userguest\Desktop\new-project`
>
> **제품명:** Blink 👀 (구 Silent Ghost)
>
> **한 줄 정의:** 북마크 앱이 아니라, **공유된 URL을 실행 가능한 행동(actions)으로 변환하는 Link-to-Action OS**
>
> **제품 정의서:** [BLINK_PRODUCT.md](./BLINK_PRODUCT.md) — 문제·시나리오·화면 스펙·로드맵·카피
>
> **아키텍처 (확정):** [BLINK_ARCHITECTURE.md](./BLINK_ARCHITECTURE.md) — LLM= fallback, enricher= code, resolver= deep link

---

## 1. 제품 철학 (절대 불변)

> 상세: [BLINK_PRODUCT.md §1–§5](./BLINK_PRODUCT.md)

| 원칙 | 설명 |
|------|------|
| **One thing at a time** | 한 화면에 하나의 행동에 집중. 벽 of text 금지 |
| **1–2 Tap Rule** | Primary action은 풀-width 히어로 버튼. 읽게 하지 말고 누르게 |
| **Share → Now → Done** | 공유 후 inbox/피드로 바로 던지지 않음. `/now`에서 Top 1 행동 먼저 |
| **Optimistic First** | spinner 금지. shimmer skeleton만 사용 |
| **Jobs-style UX** | 설명 30초, 행동 1탭. 마찰 최소화 |

**North Star:** YouTube·카톡·쇼핑몰 링크를 공유하면 3초 안에 「영상 보기」「카카오맵 열기」「쿠폰 받기」 같은 버튼이 떠야 함.

---

## 2. 기술 스택

```
Next.js 16 (App Router) + TypeScript
Tailwind CSS 4 + shadcn/ui + framer-motion
Supabase (@supabase/ssr) — DB / Auth (선택)
cheerio — 서버사이드 og meta 스크래핑
PWA — Share Target API (manifest.ts)
```

**실행:**
```bash
cd c:\Users\userguest\Desktop\new-project
npm install
npm run dev   # http://localhost:3000
npx tsc --noEmit   # 타입 체크
```

**Supabase 없이도 동작:** `sessionStorage` local fallback (`blink-local-links`)

---

## 3. 레이어 아키텍처 (L0 ~ L5)

`.cursor/rules/blink-jobs-layers.mdc`, `.cursor/rules/blink-enrichment.mdc` 참조.

```
L0 Experience   — 철학 (1탭, no scroll guilt)
L1 Surface      — 라우트/화면 (/ Feed, /now, /stack, /inbox, /archive, /demo)
L2 Interaction  — Share bridge, Now sheet, swipe Feed, Done flow
L3 Enrichment   — Generic → Domain → Intent 파이프라인
L4 Data         — Supabase links + sessionStorage fallback
L5 Intelligence — 미래 AI intent (v1은 rule + bin stats)
```

---

## 4. 라우트 맵

| Route | 컴포넌트 | 역할 |
|-------|----------|------|
| `/` | `ActionShorts` | **홈 Feed** — Shorts 스타일 세로 스와이프, 링크당 1장 |
| `/now` | `NowPageClient` | Share 직후 Action sheet. enrich preview → persist → Feed |
| `/share` | `ShareBridge` | PWA Share Target invisible bridge → `/now` redirect |
| `/stack` | `ActionStackList` | 구 Stack UI (1장 focus + ghost stack) |
| `/inbox` | `ActionFeedList` | 전체 목록 (secondary, 카드 리스트) |
| `/archive` | `ArchiveFeedList` | 만료·완료 링크 |
| `/demo` | `DemoLauncher` | 샘플 링크 6개 시드 |

**⚠️ 규칙 파일과 실제 구현 차이:**
- `.cursor/rules/silent-ghost-mvp.mdc` / `blink-jobs-layers.mdc`는 `/` = Stack으로 적혀 있음
- **현재 구현:** `/` = Shorts Feed, Stack은 `/stack`으로 분리됨
- 새 작업 시 **실제 코드(`app/page.tsx`)를 기준**으로 할 것

---

## 5. 핵심 사용자 플로우

### 5.1 Share Flow (PWA / 데모)

```
외부 앱 "공유" → GET /share?title=&text=&url=
  → toast "👀 블링크가 다음 행동을 찾는 중..."
  → redirect /now?url=...
  → POST /api/scrape { url, persist: false, context }
  → NowActionFocus (Top 1 giant pill + "그냥 Stack에 두기")
  → Primary tap 또는 Done
  → persistEnrichedLink() — background POST persist: true
  → redirect / (Feed)
```

**관련 파일:**
- `app/share/page.tsx`
- `components/now-page-client.tsx`
- `components/now-action-focus.tsx`
- `lib/share/persist-enriched-link.ts`

### 5.2 Feed Flow (홈)

```
/ → ActionShortsFeed
  → useRealtimeLinks() — Supabase or sessionStorage
  → 세로 snap scroll, 오른쪽 dot indicator
  → ActionShortsSlide — hero visual + primary pill + secondary actions
```

**관련 파일:**
- `components/action-shorts-feed.tsx`
- `components/action-shorts-slide.tsx`
- `hooks/use-realtime-links.tsx`

### 5.3 Demo Flow

```
/demo → 샘플 6개 수동 시드
개발 모드 → DevDemoSeed (providers.tsx) 자동 시드

샘플: YouTube, Naver Map, yo-go, Figma, Linear, expired Stripe
저장: lib/demo/sample-links.ts → sessionStorage blink-local-links
```

---

## 6. L3 Enrichment 파이프라인

### 6.1 3층 순서 (헌법)

```
Generic enricher  → og:title/image/description, URL 추출
Domain enricher   → youtube 등 도메인별 actions
Intent rank       → context rule + user_action_bins stats
```

### 6.2 핵심 타입 (`lib/enrichers/types.ts`)

```typescript
EnricherContext = { hour: number; installedApps: string[] }

EnrichedLink = {
  url, domain, title, image, description,
  actions: LinkActionItem[],
  enricher_id, source_type,
  fallback: { gradient, initial, titleFromDomain, imageFromFallback }
}

Enricher = {
  id: string;
  domains?: string[];
  enrich: (url, context) => Promise<EnrichedLink>;
}
```

### 6.3 LinkActionItem (`types/database.ts`)

```typescript
{
  id: string;
  label: string;
  kind: "open" | "save" | "share" | "remind" | "copy" | "custom";
  href?: string;
  payload?: { icon?: string; ... };
}
```

### 6.4 Enricher 파일 구조

```
lib/enrichers/
  types.ts                 — 타입 정의
  fetch-page-metadata.ts   — cheerio og meta fetch
  extract-urls.ts          — description에서 URL regex 추출
  generic.ts               — 80% fallback enricher
  youtube.ts               — YouTube domain enricher
  registry.ts              — domain routing + applyIntentRank
  persist.ts               — Supabase insert
  context.ts               — EnricherContext normalize
  rank-actions.ts          — rule-based context ranking (commute, kakaomap)

lib/intent/
  context-bin.ts           — "commute|kakaomap" 등 coarse bin (~6 combos)
  action-key.ts            — stable key e.g. "open:youtube"
  rank-actions.ts          — CTR - skip×0.5, MIN 8 impressions
  store.ts                 — fetchBinStats, recordActionBinEvent
  track-client.ts          — client → POST /api/intent/event
```

### 6.5 Generic enricher 동작

1. `fetchPageMetadata(url)` — og tags
2. description에서 URL 추출 → 각각 action
3. URL 없으면 `{ label: "원본 열기", icon: "external-link" }`
4. kakaomap 설치 + place URL → "카카오맵 바로 열기" prepend

### 6.6 YouTube enricher 동작

1. youtu.be, /shorts/ URL 정규화
2. **Top 1 pinned:** `{ label: "▶️ 영상 바로 재생", icon: "youtube" }` — intent rank로 재정렬 안 됨
3. description에서 timestamp (`1:23`) → `⏱ 1:23 구간 재생` secondary actions
4. description URL → external link actions

**한계:** 서버 cheerio scrape으로 YouTube og meta 품질 낮음. oEmbed/API 필요 (미구현).

### 6.7 API: `/api/scrape`

```typescript
// POST body
{ url, persist?, context?, category?, expiresAt? }

// persist: false → EnrichedLink only (Now preview)
// persist: true  → Supabase links insert (+ link row 반환)
```

**클라이언트 래퍼:** `lib/share/scrape-shared-link.ts` → `enrichSharedUrl()`

---

## 7. L4 Data

### 7.1 Supabase 테이블

**`links`** (`supabase/migrations/002_links.sql`)
```sql
id, user_id, original_url, title, thumbnail_url, domain,
category, actions (jsonb), created_at, expires_at
```

**`user_action_bins`** (`supabase/migrations/003_user_action_bins.sql`)
```sql
user_id, context_bin, action_key, impressions, clicks, skips
-- user_id NULL = global bin
-- RPC: record_action_bin_event(context_bin, action_key, event, user_id?)
```

### 7.2 Local fallback (Supabase 미설정 시)

| Key | 용도 |
|-----|------|
| `blink-local-links` | 저장된 LinkRow[] |
| `blink-now-link` | Share → Now handoff |
| `blink-now-context` | enricher context |
| `blink-dismissed-ids` | Stack/Feed에서 Done 처리한 id |

**파일:**
- `lib/local-links/store.ts`
- `lib/local-links/now-session.ts`
- `lib/share/persist-enriched-link.ts` — API 실패 시 local 저장

### 7.3 Intent 이벤트

```
/now에서 impression, click, skip
→ lib/intent/track-client.ts
→ POST /api/intent/event
→ record_action_bin_event RPC
```

**Context bin 예:** `commute|kakaomap`, `day|default`, `night|kakaomap`

**Intent score:** `CTR - skipRate×0.5`, impressions ≥ 8일 때만 boost (max ±40)

---

## 8. 주요 컴포넌트

| 파일 | 역할 |
|------|------|
| `components/action-shorts-feed.tsx` | 홈 Feed — snap scroll container |
| `components/action-shorts-slide.tsx` | Feed 1장 — hero + actions |
| `components/action-stack-list.tsx` | `/stack` — 1장 focus UI |
| `components/now-action-focus.tsx` | `/now` — giant glass pill |
| `components/now-page-client.tsx` | Now bridge + enrich + persist |
| `components/now-loading-shimmer.tsx` | 로딩 shimmer ("👀 블링크가...") |
| `components/action-card.tsx` | inbox용 재사용 카드 |
| `components/app-shell.tsx` | shell + nav. `immersive` mode for Feed |
| `components/demo-launcher.tsx` | `/demo` 허브 |
| `components/dev-demo-seed.tsx` | dev 자동 시드 |
| `components/providers.tsx` | theme + DevDemoSeed |

---

## 9. PWA

`app/manifest.ts`:
```typescript
share_target: {
  action: "/share",
  method: "GET",
  params: { title, text, url }
}
name: "Blink"
display: "standalone"
```

**미완:** 192/512 PNG 아이콘 (현재 favicon.ico만)

---

## 10. Cursor Rules (AI가 반드시 읽을 것)

| 파일 | 내용 |
|------|------|
| `.cursor/rules/silent-ghost-mvp.mdc` | MVP 가이드 (always apply) |
| `.cursor/rules/blink-enrichment.mdc` | Enrichment 헌법 |
| `.cursor/rules/blink-jobs-layers.mdc` | L0~L5 레이어 (일부 `/` 설명 outdated) |

---

## 11. 새 enricher 추가 방법

1. `lib/enrichers/{domain}.ts` 생성 — `Enricher` interface 구현
2. `lib/enrichers/registry.ts`의 `DOMAIN_ENRICHERS`에 등록
3. **카드 UI, DB 스키마는 건드리지 않음** — actions[]만 추가
4. `types.ts`의 `source_type` union에 필요 시 추가

**commerce.ts, kakao.ts** — 규칙 파일에 언급됐으나 **아직 미구현**

---

## 12. 알려진 이슈 / 과거 수정

| 이슈 | 해결 |
|------|------|
| PowerShell `&&` | `;` 사용 |
| Supabase 미설정 | sessionStorage fallback |
| YouTube scrape 품질 | domain fallback + custom actions |
| Postgres NULL unique | partial unique index (global vs user bins) |
| lucide `Youtube` icon 없음 | `Play` icon 사용 |
| rankActionsByIntent recursive TS | explicit return type 추가 |

---

## 13. 미완 / 다음 우선순위

1. **Android PWA + 실제 Share Target** — killer demo
2. **YouTube oEmbed/Data API** — Feed에서 real title + thumbnail
3. **Share → Now → Feed top** — 방금 공유한 링크 Feed 맨 위 pin
4. **YouTube description parsing** — API 필요 (서버 scrape 부족)
5. **Auth + per-user intent bins** — 로그인 시 user_id stats
6. **Phase 3 enrichers** — commerce (yo-go), kakao open chat
7. **L5 AI Intent** — preference + tap history로 Top 1 개인화
8. **PWA icons** 192/512 PNG
9. **Cursor rules 업데이트** — `/` = Feed 반영

---

## 14. 사용자 선호 / 작업 규칙

- UI copy: **한국어**
- UX: Jobs-style minimal, spinner 금지
- 코드: **최소 diff**, over-engineering 금지
- git commit: **사용자 요청 시에만**
- 테스트: substantive 변경 후 `npm test` (현재 테스트 적음)
- 제품 진화: Silent Ghost → **Blink** 👀

---

## 15. 빠른 디버깅 체크리스트

```
□ npm run dev 실행 중인가?
□ .env.local에 Supabase 키 있나? (없으면 local mode)
□ /demo에서 샘플 시드했나?
□ /now?url=https://youtube.com/watch?v=... 직접 테스트
□ sessionStorage blink-local-links 확인 (DevTools)
□ npx tsc --noEmit 통과?
```

---

## 16. 파일 트리 (소스만)

```
app/
  page.tsx              — Feed (ActionShorts)
  now/page.tsx
  share/page.tsx
  stack/page.tsx
  inbox/page.tsx
  archive/page.tsx
  demo/page.tsx
  manifest.ts
  api/scrape/route.ts
  api/intent/event/route.ts

components/
  action-shorts*.tsx    — Feed UI
  action-stack*.tsx     — Stack UI
  now-*.tsx             — Now flow
  action-card*.tsx      — Card UI
  app-shell.tsx
  demo-launcher.tsx
  dev-demo-seed.tsx
  providers.tsx
  ui/                   — shadcn

lib/
  enrichers/            — L3 pipeline
  intent/               — personalization v1
  share/                — share bridge helpers
  local-links/          — sessionStorage
  supabase/             — client, server, middleware
  demo/                 — sample data
  layers/               — layer constants
  data/fetch-links.ts
  mappers/link-row.ts

types/database.ts
supabase/migrations/
hooks/use-realtime-links.tsx
.cursor/rules/
docs/BLINK_HANDOFF.md   — 기술 핸드오프 (이 문서)
docs/BLINK_PRODUCT.md   — 제품 정의서
```

---

*마지막 업데이트: 2026-05-25 — Shorts Feed 홈, YouTube/generic enricher, intent bins v1 기준*
