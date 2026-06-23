# rimvio.com 배포 · 가비아 DNS · Vercel Pro + Supabase Pro

> **Production (목표):** `https://rimvio.com`  
> **Fallback:** `https://rimvio.vercel.app`  
> **Supabase:** `qbvvtzccmiufxgwehdnx` · **ap-northeast-1 (도쿄)**

---

## 자동 세팅 (로컬)

```powershell
cd c:\Users\userguest\Desktop\new-project

# Supabase Auth URL + Pro 체크
powershell -ExecutionPolicy Bypass -File scripts/supabase-pro-setup.ps1

# Vercel env + redeploy (APP_URL = rimvio.com)
"https://rimvio.com" | npx vercel env add NEXT_PUBLIC_APP_URL production --force
npx vercel deploy --prod --yes
```

---

## 1. Vercel — 도메인 (완료: 프로젝트에 추가됨)

Vercel → **rimvio** → **Settings** → **Domains**

- `rimvio.com` — 추가됨 (DNS 대기)
- (권장) `www.rimvio.com` → Add → Redirect to `rimvio.com`

---

## 2. 가비아 DNS 설정 (본인 계정)

[가비아](https://www.gabia.com) 로그인 → **My가비아** → **도메인** → `rimvio.com` → **DNS 관리**

### 방법 A — A 레코드 (가비아 DNS 유지) **권장**

| 호스트 | 타입 | 값 / 위치 | TTL |
|--------|------|-----------|-----|
| `@` (또는 비움) | **A** | `76.76.21.21` | 600 |
| `www` | **CNAME** | `cname.vercel-dns.com` | 600 |

Vercel Domains 화면에 다른 IP가 보이면 **Vercel UI 값을 우선**하세요.

### 방법 B — Vercel 네임서버 위임

가비아 **네임서버 변경**:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

전파 5분~48시간.

### 확인

```powershell
nslookup rimvio.com
npx vercel domains inspect rimvio.com
```

**Valid** ✓ 나오면 성공.

---

## 3. Supabase Pro (결제 후)

대시보드: https://supabase.com/dashboard/project/qbvvtzccmiufxgwehdnx

| 항목 | 값 |
|------|-----|
| Site URL | `https://rimvio.com` |
| Redirect URLs | `https://rimvio.com/auth/callback` |
| | `https://www.rimvio.com/auth/callback` |
| | `https://rimvio.vercel.app/auth/callback` |
| | `http://localhost:3000/auth/callback` |

CLI 동기화: `npx tsx scripts/sync-supabase-auth-urls.ts`

**리전:** 이미 **ap-northeast-1 (도쿄)** — 한국에서 Realtime·DB에 유리. 이전 불필요.

---

## 4. Capacitor / 앱 출시

```powershell
$env:CAPACITOR_SERVER_URL="https://rimvio.com"
npm run store:prepare:ios -- --sync
```

Privacy URL: `https://rimvio.com/privacy`

---

## 체크리스트

- [ ] 가비아 A `@` → `76.76.21.21`
- [ ] `vercel domains inspect rimvio.com` → Valid
- [ ] `NEXT_PUBLIC_APP_URL` = `https://rimvio.com` + production redeploy
- [ ] Supabase Auth Site URL / redirects 동기화
- [ ] `https://rimvio.com/api/health` → 200
- [ ] 폰 홈화면 PWA 삭제 후 재추가 (캐시)

---

## 롤백

- DNS 전: `https://rimvio.vercel.app` 계속 사용
- Vercel: 이전 deployment Promote
