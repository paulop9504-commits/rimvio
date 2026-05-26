# Blink 👀 — Link-to-Action PWA

공유 URL → 3초 안에 실행 가능한 행동(지도, YouTube, 쇼핑, 교통…)으로 변환.

## 빠른 시작

```bash
cd new-project
npm install
cp .env.example .env.local   # Supabase 선택 (없어도 sessionStorage로 동작)
npm run dev                  # http://localhost:3000
```

## 출시 전 검증

```bash
npm run verify:release       # tsc + build + analytics 실험
npm run backup               # Desktop에 zip 백업
```

## 문서

| 문서 | 내용 |
|------|------|
| [docs/LAUNCH.md](./docs/LAUNCH.md) | **출시 체크리스트** · Vercel · Supabase |
| [docs/BLINK_HANDOFF.md](./docs/BLINK_HANDOFF.md) | AI/개발 핸드오프 |
| [docs/BLINK_PRODUCT.md](./docs/BLINK_PRODUCT.md) | 제품 정의 |
| [docs/BLINK_ARCHITECTURE.md](./docs/BLINK_ARCHITECTURE.md) | 아키텍처 |

## Vercel 배포

1. GitHub에 push
2. [vercel.com/new](https://vercel.com/new) → Import
3. Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (선택)
4. Deploy

## Supabase (선택)

`supabase/migrations/` 001→004 순서로 SQL Editor 실행.  
없으면 링크·analytics는 로컬 + API no-op.

## 실험 스크립트

```bash
npm run experiment           # scrape 16 cases
npm run experiment:actions     # copy + deep link
npm run experiment:analytics   # Tier 1 집계
```

Demo: `/demo` · Share 테스트: `/share?url=...`
