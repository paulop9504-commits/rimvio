# Rimvio 👀 — Your Life, Operable.

**Action OS** for everyday intent — say it, share it, snap it → **Action Dock** executes.

North Star: *Your Life, Operable.* (당신의 모든 일상을 OS로 만듭니다.)

링크 공유는 **ingress** 중 하나입니다. 제품 정체성은 **실행(Operate)** 입니다.

브랜드 가이드: [docs/RIMVIO_BRAND.md](./docs/RIMVIO_BRAND.md)

## 빠른 시작

**Cursor:** Rimvio만 작업할 때는 [`rimvio.code-workspace`](./rimvio.code-workspace) 로 열기 ([docs/WORKSPACE.md](./docs/WORKSPACE.md)). Silent Ghost repo와 분리.

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
| [docs/PHONE_QA.md](./docs/PHONE_QA.md) | **실기기 QA** · iPhone/Android 체크리스트 |
| [docs/RIMVIO_KIPRIS.md](./docs/RIMVIO_KIPRIS.md) | KIPRIS 상표 검색 메모 |
| [docs/RIMVIO_HANDOFF.md](./docs/RIMVIO_HANDOFF.md) | AI/개발 핸드오프 |
| [docs/WORKSPACE.md](./docs/WORKSPACE.md) | **Cursor workspace (SG와 분리)** |
| [docs/RIMVIO_PRODUCT.md](./docs/RIMVIO_PRODUCT.md) | **Action OS 제품 정의** |
| [docs/RIMVIO_ARCHITECTURE.md](./docs/RIMVIO_ARCHITECTURE.md) | 아키텍처 |

## Vercel 배포

1. GitHub에 push
2. [vercel.com/new](https://vercel.com/new) → Import
3. Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (선택)
4. Deploy

## Supabase (선택)

`supabase/migrations/` 001→004 순서로 SQL Editor 실행.  
없으면 로컬 + API no-op.

## 실험 스크립트

```bash
npm run experiment           # scrape 16 cases
npm run experiment:actions     # copy + deep link
npm run experiment:analytics   # Tier 1 집계
```

Demo: `/demo` · Share ingress: `/share?url=...`
