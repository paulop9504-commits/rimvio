# Glango 브랜드 · 상표 가이드

> **Glango** (발음: 글랑고) — *glance*에서, 한 번 훑어보고 바로 행동한다는 뜻.
>
> **2026-05 리브랜드:** Google Play에 **Glang** 앱이 있어 **Glango**로 변경.

## 로고 에셋

| 파일 | 용도 |
|------|------|
| `public/glango-icon.svg` | PWA 아이콘, 앱 스플래시, 소셜 프로필 |
| `public/glango-wordmark.svg` | 가로형 로고 (눈 + Glango + 글랑고 · glance) |
| `public/glango-mark.svg` | 상표 등록용 심볼 마크 (스마일) |
| `lib/brand/glango-smiley-mark.tsx` | **통일 SVG 소스** (모든 로고의 기준) |
| `components/glango-logo.tsx` | 앱 UI React 로고 |

### 디자인 특징 (통일 스마일 마크)

- **원형 얼굴** — 흰 배경 + 짙은 회색 테두리
- **동공형 눈** — 보라 링 + 진보라 동공 (이중 원)
- **아치 스마일** — 라이트 퍼플 곡선
- 단일 `GlangoSmileyMark` — UI·PWA·네비·워드마크 공통

## 컬러

| 역할 | 값 |
|------|-----|
| Primary gradient | `#8B5CF6` → `#D946EF` → `#6366F1` |
| Iris | `#7C3AED` / `#DDD6FE` |
| Background (아이콘) | `#0F172A` |
| Wordmark text | violet–fuchsia gradient |

## 타이포

- UI 워드마크: **Glango** — bold, tight tracking, gradient clip
- 한국어 애칭: **글랑고** — caption 크기, muted

## 사용 규칙

- ✅ 눈 마크 + **Glango** 워드마크 조합
- ✅ 단독 눈 아이콘 (favicon, 헤더 pill)
- ❌ Blink 명칭 혼용 (레거시 코드·스토리지 키 제외)
- ❌ 로고 비율 찌그러뜨리기, 그라데이션 임의 변경

## 상표 · 도메인 (출시 전 체크)

- **표장:** Glango + 눈 형태 로고 (오리지널 SVG, 외부 로고 복제 아님)
- **권장 검색:** KIPRIS · USPTO — "Glango" + Class 9/42 (앱·소프트웨어)
- **도메인:** `glango.app` (Beam URL·공유 기본값)
- **Beam URL:** `https://glango.app/s/{slug}`

## 앱 내 표기

- 영문: **Glango**
- 한국어 UI: **글랑고** (필요 시 Glango · 글랑고)
- 슬로건: *링크 받으면, 한눈에 할 일*

## 코드

```ts
import { GLANGO } from "@/lib/brand/glango";
// GLANGO.name, GLANGO.nameKo, GLANGO.domain
```
