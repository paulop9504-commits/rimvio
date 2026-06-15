# Rimvio private/ — Git에 올리지 않는 자료

> 이 파일은 **`README.template.md`** 로 Git에만 올라갑니다.  
> 로컬에서 `copy private\README.template.md private\README.md` 후 아래 구조를 채우세요.

---

## 이 폴더 규칙

- **`private/` 전체 = 비공개** (`.gitignore`)
- 백업: USB / 암호 zip / 개인 클라우드 (GitHub public ❌)
- 협업자에게는 필요한 하위 폴더만 선택 전달

---

## 권장 구조

```
private/
├── env/
│   └── .env.local.backup          # 실제 API 키 — 절대 commit 금지
├── investor/
│   ├── rimvio-investor-deck.html
│   └── Rimvio_사업소개.pdf
├── product/
│   ├── RIMVIO_CONSTITUTION.md
│   ├── RIMVIO_EXPERIENCE_LAYERS.md
│   ├── RIMVIO_SCOPE_AI.md
│   └── RIMVIO_STORY_LAYER.md
├── deploy/
│   ├── DEPLOY_RIMVIO_APP_DNS.md   # 실제 도메인·DNS 값
│   └── vercel-env-notes.txt
├── ops/
│   ├── RIMVIO_KPI.md
│   └── internal-reports/
└── keys/
    ├── keystore.properties        # Android release (원본은 android/에 두고 gitignore)
    └── rimvio-release.jks
```

---

## public repo에 남길 최소 문서 (예시)

공개 저장소 `docs/`에는 **요약 1장**만:

- 제품 한 줄 · 스택 · 로컬 실행 방법
- `.env.example` 기준 설정
- 기여/라이선스 (해당 시)

상세 PRD·헌법·투자·KPI는 전부 이 `private/`에.

---

## 체크리스트 (push 전)

- [ ] `git status`에 `private/` 없음
- [ ] `.env*` 실값 없음
- [ ] keystore / `keystore.properties` 없음
- [ ] investor PDF/HTML 없음
- [ ] DNS·내부 URL 메모 없음

자세한 절차: **`docs/GIT_PUBLIC_SHARE.md`**
