# Rimvio tab architecture (3-tab shell)

> **Code SSOT:** `lib/surface-registry/rimvio-surface-ia.ts`  
> **ADR:** [adr/001-globe-first-home.md](./adr/001-globe-first-home.md)

| Tab | Route / action | Layer | UI |
|-----|----------------|-------|-----|
| **지구** | `/` (`/feed` · `/search` → redirect) | RECALL | Globe pins · recall · **composer = search·capture·chat** |
| **맞춤** | Field sheet — Reality Control Center | ACTION | queue · trades · mine |
| **친구** | `/peers` | H2H ROOM | DM · AI 렌즈 |

**Secondary (not bottom nav):** `/now` Share landing · `/inbox` deep list · legacy `/search` redirects home

**Dev / secondary:** `/stack` = next-action card — not bottom nav

## Legacy redirects

- `/feed` → `/`
- `/chat` → `/`
- `/search` → `/` (composer absorbs hub)
- `/archive` → `/?filter=archive`
- `/globe` → `/`

## Code

- `lib/surface-registry/rimvio-surface-ia.ts`
- `components/app-nav.tsx` — 3-tab (Globe · Field · People)
- `lib/nav/open-capture-sheet-bridge.ts` — focuses Globe composer

## Verify

```bash
npm run test:tab-architecture
npx tsx scripts/test-app-nav-tabs.ts
```
