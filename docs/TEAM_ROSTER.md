# Rimvio 팀 로스터 (제품 맞춤)

> 공식 레포: [paulop9504-commits/rimvio](https://github.com/paulop9504-commits/rimvio)  
> 배포: Vercel `rimvio` → Production https://rimvio.com  
> DB: Supabase `qbvvtzccmiufxgwehdnx`  
> 시크릿: [`TEAM_SECRETS.md`](./TEAM_SECRETS.md) · vault `Rimvio / .env.local (devs)`  
> 워크플로: [`TEAM_BUILD.md`](./TEAM_BUILD.md)

제품 포지션: **AI Agent 행동 효율을 사람이 잡아주는 Action Infrastructure**  
(Harness / Standard / Runtime / Verification — FE·BE가 한 제품으로 만남)

---

## 멤버

| 이름 | 트랙 | 이메일 | 제품 담당 | GitHub | Vercel | Supabase |
|------|------|--------|-----------|--------|--------|----------|
| **리드 (Captain/Ship)** | Full | (본인) | 우선순위 · `main` 머지 · env · 롤백 | Admin | **Member** | Owner |
| **최찬환** | FE | africakokiri@gmail.com | Surface — Globe · Workspace · Preview UX · 손검증 | Write → `@africakokiri` (초대 발송됨) | **Viewer** (무료) | Developer |
| **박건수** | BE | ks.nninee@gmail.com | Runtime — API · Agent loop · Prepare/Verify 서버 | Write → `@ParkKunsu` (이미 멤버) · `@nninee` 초대는 확인 후 취소 가능 | **Viewer** | Developer |
| **구희승** | BE | nrudev@naver.com | Standard — Capability/Permission/Constraint/Verify 스키마 · Hub 쪽 계약 | Write → `@nrudev` (이미 멤버) | **Viewer** | Developer |

> Vercel **Member($20)** 는 리드만. 나머지는 Viewer 또는 초대 없이 PR Preview만.

---

## 제품에 맞는 작업 경계

| 사람 | 주로 만지는 곳 | 성공 기준 |
|------|----------------|-----------|
| 최찬환 FE | `app/` · `components/` · Workspace/Globe UI | Preview에서 클릭 경로가 안 막힘 |
| 박건수 BE | `app/api/` · `lib/*` 실행·프로바이더 · Supabase 서버 | 실행이 채팅 덤프가 아니라 상태/패치로 남음 |
| 구희승 BE | Capability · Permission · Verification · 계약/스키마 | “해도 되는 행동 / 성공 판정”이 코드에 보임 |
| 리드 | 머지 · vault · Vercel env · 주간 증명 1장면 | PR → Preview → main → prod |

겹치는 건 PR에서 맞추고, **한 PR = 한 증명**.

---

## 초대 체크 (리드)

### GitHub Write
https://github.com/paulop9504-commits/rimvio/settings/access  

| 이메일 | GitHub | 상태 |
|--------|--------|------|
| africakokiri@gmail.com | `@africakokiri` | 초대 발송 (수락 대기) |
| ks.nninee@gmail.com | `@ParkKunsu` | 이미 Write |
| nrudev@naver.com | `@nrudev` | 이미 Write |

> `@nninee` 에도 Write 초대가 갔을 수 있음. 박건수가 `@ParkKunsu` 가 맞으면  
> https://github.com/paulop9504-commits/rimvio/settings/access 에서 `@nninee` pending 취소.

### Vercel Viewer (무료)
https://vercel.com/yong-s-projects17/~/settings/members  
→ Invite → 역할 **Viewer** (Member 아님)

- [ ] africakokiri@gmail.com  
- [ ] ks.nninee@gmail.com  
- [ ] nrudev@naver.com  

### Supabase Developer
https://supabase.com/dashboard/org/isqasjpgmaruxhlimcyn/team  
→ Invite → **Developer** (`service_role` 안 줌)

- [ ] africakokiri@gmail.com  
- [ ] ks.nninee@gmail.com  
- [ ] nrudev@naver.com  

### Vault
- [ ] `Rimvio / .env.local (devs)` 공유 (`private/env/VAULT_NOTE.txt`)

---

## 팀 채팅 공지 (복붙)

```text
[Rimvio 팀 세팅]

레포(이것만): https://github.com/paulop9504-commits/rimvio
Prod: https://rimvio.com
온보딩: docs/TEAM_BUILD.md
시크릿: vault 「Rimvio / .env.local (devs)」만 (계정 비번 아님)

역할
- 최찬환 FE: Surface (Globe/Workspace/Preview UX)
- 박건수 BE: Runtime (API/Agent 실행)
- 구희승 BE: Standard (Capability/Permission/Verify)
- 리드: 머지 + Vercel Member + env

규칙
1) main 직접 push 금지 → 전부 PR
2) 배포는 git merge면 자동 (Vercel Member 필요 없음)
3) Preview는 PR에 달린 URL로 확인
4) push 전: npm run team:verify

Day-1
git clone https://github.com/paulop9504-commits/rimvio.git
cd rimvio && npm ci
cp .env.example .env.local  → vault 3줄 붙여넣기
npm run dev
```
