# ADR 001: Globe-first home at `/`

**Status:** Accepted (2026-07)  
**Supersedes:** Feed-as-home tab (`/feed` primary) in pre-2026 docs and rules

## Context

Rimvio home was documented as a Feed-first slot surface (`/feed`). Code shipped **Globe-first** home at `/` (`GlobeHomeClient`) with Three Floors replay (pins · shorts · caption). Docs, cursor rules, and agent prompts drifted — causing wrong implementation targets.

## Decision

1. **Canonical home route:** `/` = Globe (RECALL floor).
2. **Bottom nav (4 tabs):** 지구 · 맞춤 · 친구 · 기록 — see `lib/surface-registry/rimvio-surface-ia.ts`.
3. **Feed semantics** live on Globe home (replay), not a separate Feed tab. Legacy `/feed` redirects to `/` (query preserved).
4. **Capture / search ingress:** `/search` hub + `rimvio:search` scope; `/chat` redirects to `/search`.
5. **Archive:** `/?filter=archive` on Globe — `/archive` redirects; no standalone archive tab.
6. **Stack:** `/stack` remains dev/secondary (one sharp card) — not home, not bottom nav.

## Consequences

| Area | Change |
|------|--------|
| SSOT | `lib/surface-registry/rimvio-surface-ia.ts` + `docs/RIMVIO_TAB_ARCHITECTURE.md` |
| Tests | `scripts/test-tab-architecture.ts` asserts SSOT ↔ `app-nav` ↔ redirect pages |
| Rules | `.cursor/rules/rimvio-jobs-layers.mdc`, `rimvio-product.mdc` reference SSOT |
| Investor / external copy | Globe home wording; "Feed" = replay on Globe or `/search` hub |

## Redirect table

| Legacy | Canonical |
|--------|-----------|
| `/feed` | `/` |
| `/globe` | `/` |
| `/chat` | `/search` |
| `/archive` | `/?filter=archive` |
