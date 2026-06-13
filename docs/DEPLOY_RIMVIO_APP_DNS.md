# rimvio.app 배포 · DNS 복구

> **2026-06 확인:** 배포 상태 `Ready`인데 URL이 **402** / **paused** 로 보이면 **두 가지**를 모두 해야 합니다.

---

## 원인 (확인됨)

| 문제 | 증상 | 원인 |
|------|------|------|
| **A. Vercel 트래픽 차단** | `402 Payment Required`, "deployment is temporarily paused" | Hobby fair use / 계정 한도 — **빌드는 성공, 엣지 서빙만 중지** |
| **B. DNS 미연결** | Vercel **무효 구성**, `nslookup rimvio.app` 실패 | 도메인 등록업체에 **A 레코드 또는 NS** 없음 |

배포 자체: `rimvio` · production **Ready** (`rimvio-17sa9dsbe-...`) — **코드 문제 아님**.

---

## 1. Vercel 트래픽 다시 켜기 (필수)

1. [vercel.com/dashboard](https://vercel.com/dashboard) → **paulop9504-dotcom's projects** → **rimvio**
2. 상단 배너: **Paused / Fair Use / Payment required** 확인
3. **Resume** 또는 **Upgrade to Pro** / 결제 수단 확인
4. 복구 후 브라우저에서 테스트:
   - `https://rimvio-17sa9dsbe-paulop9504-dotcoms-projects.vercel.app`
   - `https://new-project-pi-one-52.vercel.app`

CLI로 배포 상태만 보려면:

```powershell
cd c:\Users\userguest\Desktop\new-project
npx vercel inspect rimvio-17sa9dsbe-paulop9504-dotcoms-projects.vercel.app
```

`status: Ready` 여도 **402**면 계정 쪽이 아직 막힌 것.

---

## 2. rimvio.app DNS 연결 (필수)

Vercel → **rimvio** → **Settings** → **Domains** → `rimvio.app`

### 방법 A — A 레코드 (등록업체 DNS 유지) **권장**

도메인 산 곳(GoDaddy, Cloudflare, 가비아 등) DNS 관리:

| Type | Name | Value |
|------|------|--------|
| **A** | `@` | `216.198.79.1` |

(Vercel UI에 **76.76.21.21** 만 보이면 그 IP도 가능. UI에 표시된 값을 **우선** 따르세요.)

**www** 서브도메인도 쓰면:

| Type | Name | Value |
|------|------|--------|
| **CNAME** | `www` | `cname.vercel-dns.com` |

### 방법 B — Vercel 네임서버 (한 번에 위임)

등록업체에서 Nameserver를 아래로 변경:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

이후 Vercel Domains에서 **Valid** 될 때까지 5분~48시간.

### 확인

```powershell
nslookup rimvio.app
npx vercel domains inspect rimvio.app
```

`Current Nameservers` / A 레코드가 ✓ 이면 성공.

---

## 3. 로컬 개발 (DNS/Vercel과 무관)

```powershell
cd c:\Users\userguest\Desktop\new-project
npm run dev
```

→ `http://localhost:3000`

---

## 4. 코드 올리기 (402·DNS 해결 **후**)

로컬이 `origin/main`보다 앞서 있으면:

```powershell
git add -A
git commit -m "..."
git push origin main
```

Vercel Git 연결 시 자동 production 배포.

---

## 체크리스트

- [ ] Vercel 대시보드에서 pause/402 해제
- [ ] `rimvio.app` A → `216.198.79.1` (또는 NS 위임)
- [ ] `vercel domains inspect rimvio.app` — Valid
- [ ] 폰 PWA 캐시: 홈 화면 앱 삭제 후 재추가
- [ ] (선택) Supabase migration 036·037 적용

---

## 내가 코드로 못 고르는 것

- **등록업체 DNS 패널** — 본인 계정 로그인 필요
- **Vercel 결제 / fair use unpause** — 본인 billing 필요

위 두 가지만 하면 `rimvio.app` + `*.vercel.app` 모두 정상화됩니다.
