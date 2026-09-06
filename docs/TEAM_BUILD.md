# Rimvio · 5인 팀 빌드 세팅

> 목표: 누구나 **같은 레포 → Preview URL → 검증 → main 배포**까지 혼자 막히지 않게.

관련: [`LAUNCH.md`](./LAUNCH.md) · [`.env.example`](../.env.example) · CI [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

---

## 0. 한 줄 워크플로

```text
branch → PR → GitHub CI + Vercel Preview → 사람이 Preview로 확인 → main merge → Production
```

| 단계 | 누가 | 무엇을 |
|------|------|--------|
| 코딩 | 전원 | feature 브랜치 |
| 자동 검증 | CI | `verify:pipeline` · typecheck · lint · build |
| 사람 검증 | 리뷰어 + 작성자 | **Preview URL**에서 클릭/플로우 확인 |
| 배포 | `main` merge | Vercel Production (수동 `deploy:prod`는 비상용) |

**규칙:** Production에 직접 push하지 않는다. 항상 PR.

---

## 1. Day-0 (리드가 한 번만)

### 1.1 공식 remote 하나 고정

지금 로컬에 remote가 둘 있을 수 있다.

| remote | URL |
|--------|-----|
| **공식 SSOT** | `https://github.com/paulop9504-commits/rimvio.git` (Vercel 연결) |
| 참고 | `paulop9504-dotcom/rimvio` — 팀 clone은 commits 쪽 |

멤버·역할 SSOT: [`TEAM_ROSTER.md`](./TEAM_ROSTER.md)

```bash
git remote -v
# git remote set-url origin https://github.com/paulop9504-commits/rimvio.git
```

### 1.2 GitHub

1. 공식 repo → **Settings → Collaborators** → 팀원 invite (Write) — 로스터 이메일 참고
2. **Settings → Branches** → `main` protection:
   - Require pull request
   - Require status checks: **CI** (`ci.yml`의 `ci` job)
   - (가능하면) Require linear history off OK / force push 금지
3. Vercel Git integration이 같은 repo에 연결돼 있는지 확인

### 1.3 Vercel

1. Team/Project에 멤버 초대 (최소 **Viewer**로 Preview 링크 열람, 배포 담당은 **Member**)
2. Production + Preview env가 채워져 있는지 확인 (`.env.example` 기준)
3. Preview에서도 OAuth가 필요하면:

```powershell
npm run setup:preview-env
```

4. Production URL: [https://rimvio.app](https://rimvio.app) (또는 현재 Vercel production domain)

### 1.4 시크릿 공유

- `.env.local`은 **커밋 금지**
- 공유: 1Password / Notion private / sealed DM — 키 이름만 `docs`에, 값은 vault에
- 최소 로컬 기동: Supabase 없이도 `npm run dev` 가능 (기능 일부 local-only)

### 1.5 역할 (현재 로스터)

| 이름 | 트랙 | 제품 담당 |
|------|------|-----------|
| 리드 | Captain/Ship | 머지 · env · Vercel Member |
| 최찬환 | FE / Surface | Globe · Workspace · Preview UX |
| 박건수 | BE / Runtime | API · Agent 실행 |
| 구희승 | BE / Standard | Capability · Permission · Verify |

상세·이메일·초대 체크: [`TEAM_ROSTER.md`](./TEAM_ROSTER.md)

---

## 2. 팀원 Day-1 (30분)

```bash
git clone https://github.com/paulop9504-dotcom/rimvio.git
cd rimvio
npm ci
cp .env.example .env.local
# vault에서 공유받은 값만 .env.local에 채움
npm run dev
```

브라우저: [http://localhost:3000](http://localhost:3000)

로컬 빠른 검증:

```bash
npm run team:verify
```

통과하면 개발 시작 가능. 전체 장시간 suite는 CI에 맡긴다.

---

## 3. 매일 개발 루프

```bash
git checkout main
git pull
git checkout -b feat/짧은-목적

# … 작업 …

npm run team:verify          # push 전 최소 게이트
git push -u origin HEAD
# GitHub에서 PR 생성 → Preview URL 기다림
```

PR 본문은 템플릿(`.github/pull_request_template.md`)을 채운다.  
**반드시 Preview URL + “어떻게 눌러보면 되는지” 3줄.**

---

## 4. 배포·보기·검증 (팀이 헤매지 않게)

### 보기

| 환경 | URL | 언제 |
|------|-----|------|
| Local | `http://localhost:3000` | 개발 |
| Preview | Vercel이 PR에 댓글/체크하는 URL | 리뷰·QA |
| Production | https://rimvio.app | merge 후 |

### 검증 티어

| 티어 | 명령 | 언제 |
|------|------|------|
| **T0 로컬 게이트** | `npm run team:verify` | push 전 |
| **T1 CI** | PR의 **CI** 체크 | merge 전 필수 |
| **T2 Preview 손검증** | 아래 체크리스트 | merge 전 권장 |
| **T3 배포 준비** | `npm run verify:deploy` | prod 이슈/릴리즈 전 |
| **T4 원격 헬스** | `npm run verify:deploy -- --remote` | prod 배포 후 |

### Preview 손검증 (최소)

작성자 또는 Ship이 PR에 ✅:

- [ ] `/` 로드 (Globe/홈 깨짐 없음)
- [ ] 이번 PR이 만진 플로우 1개 end-to-end
- [ ] 콘솔에 빨간 에러 없음 (관련 경로)
- [ ] 권한/결제/Commit 같은 위험 경로면 **승인 UI**가 보이는지

### Production

- 기본: `main` merge → Vercel auto Production
- 비상 수동: `npm run deploy:prod` (리드만)
- 롤백: Vercel Dashboard → 이전 Deployment **Promote**

---

## 5. “쉽다”를 만드는 운영 규칙

1. **PR 없이 main 금지**
2. **Preview URL 없는 PR은 리뷰 시작 안 함** (docs-only 제외)
3. **한 PR = 한 증명** (큰 피벗도 슬라이스)
4. Secrets는 채팅에 붙이지 않음
5. “됐다”는 채팅이 아니라 **Preview에서 재현**으로만 선언
6. CI red면 merge 금지 — 로컬에서만 green인 상태 금지

---

## 6. 막힐 때

| 증상 | 먼저 |
|------|------|
| `npm ci` 실패 | Node 22 · `package-lock` 동기화 |
| 로컬만 깨짐 | `.env.local` vs `.env.example` 키 이름 |
| Preview 404/auth | Vercel Preview env · `NEXT_PUBLIC_APP_URL` |
| CI만 red | Actions 로그의 실패한 step만 로컬 재실행 |
| 배포 후 OAuth | Supabase redirect + `NEXT_PUBLIC_APP_URL` |

헬스: Production `/api/health` · `npm run verify:deploy -- --remote`

---

## 7. 체크리스트 (리드 완료 표시용)

- [ ] 공식 GitHub remote 확정 + 팀 clone URL 공유
- [ ] Collaborators 4명 Write
- [ ] `main` branch protection + CI required
- [ ] Vercel 멤버 초대 + Preview/Production env
- [ ] Secret vault 공유
- [ ] 전원 `npm run team:verify` green 확인
- [ ] 첫 연습 PR 1개 (작은 docs/chore)로 Preview 흐름 체험
