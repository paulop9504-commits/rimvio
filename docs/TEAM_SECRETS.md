# Rimvio 팀 시크릿 정리 (SSOT)

> **실제 비밀값(service_role, OAuth secret 등)은 이 파일에 넣지 않는다.**  
> Vault(1Password/Bitwarden)에만 값을 두고, 이 문서는 **키 목록·등급·채우는 곳**만 관리한다.  
> 출처: `.env.example` · Supabase project `qbvvtzccmiufxgwehdnx` · Vercel project `rimvio`

로컬: `.env.local` ← `cp .env.example .env.local` 후 vault 값 붙여넣기  
배포: Vercel Project → Settings → Environment Variables (Production + Preview)

---

## A. 전원 vault 공유 (로컬 개발 최소)

| Key | 등급 | 값 / 어디서 | 비고 |
|-----|------|-------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | `https://qbvvtzccmiufxgwehdnx.supabase.co` | 확정 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (client) | Supabase → Settings → API → `anon` **legacy** JWT | 아래 vault 템플릿 |
| `NEXT_PUBLIC_APP_URL` | Public | 로컬: `http://localhost:3000` | Preview/Prod는 Vercel에 따로 |

**없으면:** Supabase 없이 local-only로도 `npm run dev` 가능 (로그인·동기화 제한).

### Vault에 넣을 최소 블록 (팀원용)

리드 PC에 이미 만들어 둠 (**Git 밖**):

- `private/env/team-dev.env` — 그대로 `.env.local` 복사본
- `private/env/VAULT_NOTE.txt` — 1Password Secure Note에 붙여넣을 문구

**1Password 만드는 법 (리드 2분)**  
1. New Item → **Secure Note**  
2. Title: `Rimvio / .env.local (devs)`  
3. `private/env/VAULT_NOTE.txt` 본문 붙여넣기  
4. Share → 팀원 초대 (또는 Shared Vault에 넣기)

anon 키 재확인: https://supabase.com/dashboard/project/qbvvtzccmiufxgwehdnx/settings/api

---

## B. 리드 + Ship만 (서버 / 파괴적)

| Key | 용도 | 공유 |
|-----|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 upsert·우회 RLS | **리드/Ship만** · 클라이언트·채팅 금지 |
| `SUPABASE_ACCESS_TOKEN` | CLI 마이그레이션 (`db:apply`) | 마이그레이션 담당만 |
| `SUPABASE_PROJECT_REF` | `qbvvtzccmiufxgwehdnx` | 위와 함께 |

Dashboard: https://supabase.com/dashboard/project/qbvvtzccmiufxgwehdnx/settings/api

---

## C. 기능 켤 때 (팀 vault 또는 Vercel — 기능 담당)

### Vision / LLM / Maps
| Key | 용도 |
|-----|------|
| `GEMINI_API_KEY` / `GOOGLE_GEMINI_API_KEY` | 비전·텍스트 LLM |
| `GOOGLE_CLOUD_VISION_API_KEY` | Vision 대체 |
| `GOOGLE_PLACES_API_KEY` / `GOOGLE_MAPS_API_KEY` | Places / Maps / YouTube 폴백 |
| `YOUTUBE_DATA_API_KEY` | YouTube 메타 |
| `OPENAI_API_KEY` | OpenAI 경로 |
| `CAPTURE_VISION_PROVIDER` / `COMPOSE_LLM_PROVIDER` | 보통 `gemini` |

### Search / weather
| Key | 용도 |
|-----|------|
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 검색 |
| `GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_ID` | Google CSE |
| `OPENWEATHER_API_KEY` | 날씨 |

### OAuth / Integrations (secret은 리드만)
| Key | 용도 |
|-----|------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google 로그인·캘린더 |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` | Notion |
| `INTEGRATIONS_ENCRYPTION_KEY` | 연동 토큰 암호화 |
| `VAULT_ENCRYPTION_KEY` | 개인 vault 암호화 (prod) |

### Hub / PG / 숙소
| Key | 용도 |
|-----|------|
| `NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | Hub GitHub |
| `NEXT_PUBLIC_VERCEL_INTEGRATION_ID` / `VERCEL_INTEGRATION_CLIENT_SECRET` | Hub Vercel |
| `NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID` / `SUPABASE_OAUTH_CLIENT_SECRET` | Hub Supabase |
| `STRIPE_*` / `TOSS_*` / `KAKAO_PAY_*` | 결제 |
| `LITEAPI_API_KEY` (+ currency/nationality 등) | 호텔 재고·체크아웃 |
| `AIRBNB_PARTNER_*` | Airbnb 파트너 (없으면 handoff) |

### Apple MapKit (선택 — private key 절대 NEXT_PUBLIC 금지)
| Key | 용도 |
|-----|------|
| `APPLE_MAPKIT_TEAM_ID` / `KEY_ID` / `PRIVATE_KEY` | Workspace Apple 지도 |
| `NEXT_PUBLIC_WORKSPACE_MAP_PROVIDER` | 기본 `maplibre`면 키 불필요 |

### Kakao / PWA
| Key | 용도 |
|-----|------|
| `KAKAO_REST_API_KEY` / `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 웹푸시 |

### local-agent (`apps/local-agent`)
| Key | 용도 |
|-----|------|
| `RIMVIO_API_BASE_URL` | 기본 `https://rimvio.com` |
| `RIMVIO_DEVICE_ID` / `TOKEN` / `NAME` | 디바이스 페어링 |
| `RIMVIO_CHROME_CDP_URL` | 로컬 크롬 디버그 |

---

## D. 등급 규칙 (팀 공지용)

| 등급 | 예 | 규칙 |
|------|----|------|
| **Public** | `NEXT_PUBLIC_*`, anon | vault + `.env.local` OK · git 커밋은 example만 |
| **Server secret** | `*_SECRET`, `SERVICE_ROLE`, `*_PRIVATE_KEY` | 리드/Ship · Vercel env · 채팅 금지 |
| **CLI only** | `SUPABASE_ACCESS_TOKEN` | 마이그레이션 돌리는 사람만 |

---

## E. 리드 체크리스트

- [ ] Vault 항목 `Rimvio /.env.local (devs)` — A섹션만
- [ ] Vault 항목 `Rimvio / server (lead)` — B + 사용 중인 C secrets
- [ ] Vercel Production/Preview에 동일 서버 키 존재 확인  
  https://vercel.com/yong-s-projects17/rimvio/settings/environment-variables
- [ ] `SERVICE_ROLE`이 팀원 DM/슬랙에 없는지 확인
- [ ] 팀원 Day-1: A만 넣고 `npm run dev` → `npm run team:verify`

---

## F. 값 채우는 대시보드

| 서비스 | URL |
|--------|-----|
| Supabase API keys | https://supabase.com/dashboard/project/qbvvtzccmiufxgwehdnx/settings/api |
| Vercel env | https://vercel.com/yong-s-projects17/rimvio/settings/environment-variables |
| LiteAPI / Nuitee | https://connect.nuitee.com/ |
| 키 이름 원본 | 레포 `.env.example` |
