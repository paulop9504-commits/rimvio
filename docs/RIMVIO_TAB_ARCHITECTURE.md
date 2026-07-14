# Rimvio tab architecture (4-tab shell)

> **Code SSOT:** `lib/surface-registry/rimvio-surface-ia.ts`  
> **ADR:** [adr/001-globe-first-home.md](./adr/001-globe-first-home.md)

| Tab | Route / action | Layer | UI |
|-----|----------------|-------|-----|
| **지구** | `/` (`/feed` → redirect) | RECALL | Globe pins · recall · compose dock |
| **맞춤** | Field sheet — Reality Control Center | ACTION | queue (반영 대기) · trades · mine |
| **친구** | `/peers` | H2H ROOM | DM · AI 렌즈 |
| **기록** | Capture sheet (bottom-nav ＋) | SENSE | 사진 · 링크 · 메모 |

**Secondary (not bottom nav):** `/search` = capture hub + `rimvio:search` scope · `/now` Share landing · `/inbox` deep list

**Dev / secondary:** `/stack` = next-action card (one sharp) — not bottom nav

## Legacy redirects

Defined in `RIMVIO_REDIRECTS` (`lib/surface-registry/rimvio-surface-ia.ts`):

- `/feed` → `/` (recall query preserved)
- `/chat` → `/search`
- `/archive` → `/?filter=archive`
- `/globe` → `/` (recall deep links)

## Code

- `lib/surface-registry/rimvio-surface-ia.ts` — routes · nav keys · redirects
- `components/app-nav.tsx` — 4-tab bottom bar (Globe · Field · People · Capture)
- `components/globe/globe-home-client.tsx` — home surface
- `components/search/action-search-hub.tsx` — search hub entry
- `lib/action-chat/chat-store.ts` — `ActionChatScopeKind` + `rimvio:search`

## Verify

```bash
npm run test:tab-architecture
npx tsx scripts/test-app-nav-tabs.ts
npm run test:client-turn-route
npm run verify:rimvio-v1
```
