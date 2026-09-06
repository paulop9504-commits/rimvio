<div align="center">

# 👀 Rimvio · 림비오

**Experience OS** — lived context → **Recall** → **Action**

*Your Life, Operable.*

<br />

[![Try Rimvio](https://img.shields.io/badge/▶_Try_Rimvio-rimvio.app-8B5CF6?style=for-the-badge)](https://rimvio.app)
[![Profile](https://img.shields.io/badge/GitHub-paulop9504--dotcom-181717?style=for-the-badge&logo=github)](https://github.com/paulop9504-dotcom)

<br />

<a href="https://rimvio.app">
  <img src="./public/rimvio-wordmark.svg" alt="Rimvio" width="420" />
</a>

<br />

**Globe** · plug-in **context hubs** · Share → Now · 1-tap actions

</div>

---

## Try it

| | Link |
|---|------|
| **Live app** | **[https://rimvio.app](https://rimvio.app)** |
| **Demo route** | [rimvio.app/demo](https://rimvio.app/demo) |
| **Feedback** | [Open an issue](../../issues/new?template=feedback.yml) |

> Sign in with Google to save context across devices.

---

## What is Rimvio?

Not another chat app. **Rimvio** structures what you lived (place · people · moment) and surfaces the **next action** — flights, maps, share — in one tap.

| Surface | Role |
|---------|------|
| **Globe** | Pin contexts on a 3D map |
| **Hubs** | Plug in / unplug resource hubs (e.g. departure airport → flight search) |
| **Feed** | Replay → Context → Action |
| **Share → Now** | Share a link → land on action sheet, not an inbox scroll |

**Stack:** TypeScript · Next.js · React · Supabase · Vercel · PWA · Three.js / globe.gl

---

## Quick start (local)

```bash
git clone https://github.com/paulop9504-dotcom/rimvio.git
cd rimvio
npm ci
cp .env.example .env.local   # optional Supabase
npm run dev                  # http://localhost:3000
```

```bash
npm run team:verify          # push 전 최소 게이트 (팀 권장)
npm test                     # 넓은 script tests
npm run build                # production build
```

### Team

로스터·역할: **[docs/TEAM_ROSTER.md](./docs/TEAM_ROSTER.md)** · 온보딩: **[docs/TEAM_BUILD.md](./docs/TEAM_BUILD.md)**  
루프: `branch → PR → CI + Vercel Preview → 손검증 → main → Production`

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) · latest: **context hubs** (plug-in departure airports, flight deep links).

---

## Docs (public)

| Doc | |
|-----|---|
| [TEAM_ROSTER.md](./docs/TEAM_ROSTER.md) | 팀 로스터 · 역할 · 초대 체크 |
| [TEAM_BUILD.md](./docs/TEAM_BUILD.md) | 온보딩 · PR Preview · 검증 |
| [TEAM_SECRETS.md](./docs/TEAM_SECRETS.md) | env 등급 · vault |
| [LAUNCH.md](./docs/LAUNCH.md) | Deploy checklist · Vercel · Supabase |
| [PHONE_QA.md](./docs/PHONE_QA.md) | Device QA |
| [GOOGLE_AUTH.md](./docs/GOOGLE_AUTH.md) | Google sign-in |
| [RIMVIO_PRODUCT.md](./docs/RIMVIO_PRODUCT.md) | Product definition |
| [RIMVIO_ARCHITECTURE.md](./docs/RIMVIO_ARCHITECTURE.md) | Architecture |

---

## License

Private / all rights reserved unless noted otherwise in repo. Feedback and stars welcome.

**Maintainer:** [@paulop9504-dotcom](https://github.com/paulop9504-dotcom)
