# 투자 신청서 작성 초안 (Rimvio)

> 폼에 **복사·붙여넣기** 후 `[ ]`만 본인 정보로 바꾸세요.  
> 글자 수는 한글 기준 대략치입니다 (폼이 바이트 제한이면 더 줄이세요).

---

## 1. 팀명

```
Rimvio
```

(법인명이 있으면 법인명, 없으면 **Rimvio** 또는 **림비오**)

---

## 2. 담당자 직함

```
[이름] 대표
```

예: `홍길동 대표` / `김OO CEO & Founder`

---

## 3. 이메일

```
[your-email@domain.com]
```

※ 스티커·후속 연락용 — 자주 확인하는 주소 권장

---

## 4. 사업 아이템 (500자 이내) — **약 480자**

```
Rimvio(림비오)는 챗봇이 아닌 「개인 Action OS」입니다. 카톡·유튜브·쇼핑·지도에서 받은 링크·사진·말을 AI가 분석해 「지금 할 일」1개(Primary Action)와 실행 버튼 묶음(Action Dock)으로 바꿉니다. 휴대폰 공유 메뉴(PWA Share Target)로 앱에 넘기면 3초 안에 재생·지도·구매 등 1~2탭 실행이 가능하고, 안 하면 Feed에 쌓아 부담 없이 나중에 처리합니다. 북마크·인박스에만 쌓이고 실행되지 않는 문제(저장=무덤, 죄책감)를 Operable UX로 해결합니다. 슬로건 Your Life, Operable. 도메인별 버튼 생성(Enricher)·행동 학습·일정·결제 확장 아키텍처 보유. Next.js PWA·Android 네이티브 브릿지 구현 완료, 베타·데모 운영 중.

링크: https://rimvio.app (또는 Vercel 데모 URL)
```

**짧은 버전 (약 320자)** — 제한이 빡할 때:

```
Rimvio(림비오)는 링크·사진·음성을 「실행 버튼」으로 바꾸는 개인 Action OS입니다. 공유 한 번 → Top 1 행동 제시 → 1~2탭 실행. 챗이 아니라 Operable UX에 집중하며, 북마크 무덤·미실행 죄책감을 줄입니다. PWA·모바일 공유 연동·도메인별 Action 생성기 구현 완료. https://rimvio.app
```

---

## 5. 창업자 프로필 (500자 이내)

**아래를 본인 경력으로 채워 넣으세요.**

```
[이름] 대표: [나이]세, [대학·전공], [회사·직무]([연도]~[연도]) — Rimvio 제품·기술 총괄. Next.js PWA·Action OS·LLM 오케스트레이션 직접 설계·구현.

[공동창업자 있으면]
[이름] [직함]: [나이]세, [학력], [경력 한 줄]

[팀 강점 한 줄]
모바일 UX·AI intent→action 파이프라인·도메인 Enricher를 단일 제품 OS로 통합한 풀스택 창업팀.
```

**작성 팁**

- 숫자·기간·회사명을 구체적으로 (심사가 「실행력」을 봄)
- 공동창업자 없으면 대표 1인 + 「핵심 역량: 풀스택 제품 개발 N년」으로 500자 채우기
- 과장보다 **지금 repo에 있는 것**(PWA, Share Target, Action Dock, 400+ 테스트 스크립트)과 연결

---

## 6. 사업소개 PDF (10MB 이내)

**파일:** `docs/investor/rimvio-investor-deck.html` → PDF (돈·시장·수익 중심, 기술은 비공개 톤)

### 방법 A — 브라우저 (가장 쉬움)

1. `rimvio-investor-deck.html` 더블클릭 (Chrome/Edge)
2. `[이름]` `[email]` `[Ask]` 등만 수정 후 저장
3. **Ctrl+P** → 대상 **PDF로 저장** → `Rimvio_사업소개.pdf`
4. 용량 10MB 이하 (이미지 없음 → 보통 1MB 미만)

### 방법 B — 스크립트

```powershell
cd c:\Users\userguest\Desktop\new-project
node scripts/generate-investor-pdf.mjs
```

→ `docs/investor/Rimvio_사업소개.pdf`

---

## 체크리스트 (제출 전)

- [ ] 데모 URL이 열리는지 (심사관이 클릭함)
- [ ] 이메일 오타 없음
- [ ] PDF에 팀명·연락처·한 줄 정의 포함
- [ ] 500자 필드에서 링크 줄이 글자 수에 포함되는지 확인
