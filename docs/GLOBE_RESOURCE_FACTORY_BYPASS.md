# Globe resource factory — bypass audit

Canonical factory: `lib/resource/resource-factory.ts` → `createResourceFromConversation(chatSessionId, resourceType)`.

All user-visible resources should originate from a chat session (`graphId` / `ChatSessionId`). The paths below still create truth or drafts **without** a chat thread UI — migrate toward the factory over time.

## Bypass paths (as of 2026-07)

| Path | What it creates | Chat session? |
|------|-----------------|---------------|
| `lib/context-run/commit-text-context.ts` | Event + fragment from plain text | No thread UI |
| `lib/globe/create-manual-globe-context.ts` | Manual schedule + pin (`GlobeCreateContextSheet`) | No |
| `lib/globe/market/commit-market-intent-quick-list.ts` | Quick-list pin + listing | Composer/chat turn only |
| `lib/globe/market/commit-market-intent.ts` | Wizard confirm → market intent | Wizard sheet, not chat |
| `components/portal/rimvio-portal-sheet.tsx` | Intent tile → wizard | No |
| `components/globe/globe-market-intent-wizard-sheet.tsx` | Multi-step form | No |
| `lib/portal/commit-portal-social-context.ts` | together/join metadata | Clarify loop only |
| `lib/feed/ingest-globe-context-capture.ts` | Photo/link/memo truth | Optional |
| `lib/media-pool/attach-pool-media-to-event.ts` | Pool → context attach | No |
| `components/globe/globe-home-client.tsx` `openPortal` | May `commitTextContextIngress` before sheet | No |

## Target state

1. **Globe map** — pins only; no cards/forms on map (`GlobeChatScreen` is the sole compose UI).
2. **Field** — read/trade surfaces; creation redirects to Globe chat.
3. **Factory** — `createResourceFromConversation` is the only approved export path for sell_item / job / real_estate drafts ready to publish.

## Enforcement

- ESLint: `components/globe/globe-flat-map-stage.tsx` blocks card/checklist imports.
- Review: new `MarketIntentDraft` construction outside `resource-factory` or `resolve-portal-compose-run-turn` requires explicit waiver.
