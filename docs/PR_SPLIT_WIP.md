# WIP PR Split — checkout · room · recall

**Base:** `main` (or current integration branch)  
**Merge order:** PR1 → PR2 → PR3 (each rebases on prior)

---

## PR1 — `feat/hub-lodging-checkout`

**Title:** feat(globe): in-app lodging checkout (LiteAPI + PG + Identity Vault)

**Scope:** Transaction spine only — no room-card refactor, no recall UI.

### Include

```
app/api/hub/checkout/**
lib/globe/hub-checkout/**
lib/identity-vault/**
lib/payment-vault/**          (if present)
components/globe/globe-hub-checkout-sheet.tsx
components/globe/globe-express-checkout-sheet.tsx
components/settings/identity-vault-settings-panel.tsx
components/globe/lodging/globe-lodging-booking-ui.tsx   (checkout UI only)
lib/globe/resource/emit-hub-action-with-identity.ts
lib/globe/resource/hub-action-record.ts               (purchase payload fields)
lib/globe/resource/context-hub-action-log-metadata.ts
lib/globe/resource/hub-action-record-store.ts
lib/vault/types.ts
lib/vault/vault-object-keys.ts
app/api/vault/objects/route.ts
.env.example
docs/RIMVIO_LITEAPI_INTEGRATION.md
docs/RIMVIO_IDENTITY_VAULT.md
docs/GLOBE_HUB_RESOURCE.md                            (3-layer section only)
scripts/test-hub-checkout.ts
scripts/test-hub-action-record.ts
scripts/test-hub-action-durable-log.ts
scripts/test-liteapi-checkout-prep.ts
lib/copy/human-ko.ts                                    (hubCheckout + identityVault keys)
lib/i18n/bundles/en.ts                                  (matching keys)
```

### Verify

```bash
npm run test:hub-checkout        # add script if missing
npx tsx scripts/test-hub-action-durable-log.ts
```

---

## PR2 — `feat/lodging-live-room-rates`

**Title:** feat(globe): LiteAPI live room rates + P1/P2 room photos

**Depends on:** PR1 merged (checkout session types)

### Include

```
lib/globe/context-hub/derive-lodging-room-offers.ts
lib/globe/context-hub/resolve-lodging-room-offers.ts    (if split)
lib/globe/context-hub/read-lodging-resource-inventory.ts
lib/globe/context-hub/load-lodging-inventory-rows.ts
lib/globe/context-hub/lodging-resource-types.ts
lib/globe/context-hub/providers/liteapi/**
app/api/globe/lodging-inventory/route.ts
components/globe/globe-lodging-room-card-list.tsx
components/globe/lodging/globe-lodging-booking-ui.tsx   (room cards)
components/globe/globe-lodging-focus-stage.tsx          (room list wiring)
components/globe/globe-context-hub-rail.tsx             (room list slot only)
components/globe/globe-resource-reel-detail.tsx
components/globe/globe-assistant-compose-thread.tsx
scripts/test-lodging-room-offers.ts
scripts/test-lodging-price-consistency.ts
scripts/test-lodging-booking-p0.ts
scripts/test-liteapi-room-offer-images.ts
scripts/test-liteapi-lodging-search.ts
lib/copy/human-ko.ts                                    (lodgingRoomCard* keys)
```

### Verify

```bash
npx tsx scripts/test-lodging-room-offers.ts
npx tsx scripts/test-liteapi-room-offer-images.ts
npx tsx scripts/test-lodging-price-consistency.ts
```

---

## PR3 — `feat/context-recall-day2`

**Title:** feat(globe): post-checkout recall badge + action log strip + Day 2 E2E

**Depends on:** PR1 (action log emit on checkout)

### Include

```
lib/globe/enrich-globe-pin-recall-badge.ts
lib/globe/context-hub/summarize-context-recall.ts
lib/globe/resource/format-hub-action-timeline.ts
components/globe/globe-context-recall-badge.tsx
components/globe/globe-context-hub-action-strip.tsx
components/globe/globe-context-hub-rail.tsx               (recall + action strip)
lib/globe/create-globe-3d-pin-element.ts                (recall badge DOM)
lib/feed/experience-globe-ping-types.ts
lib/test/e2e-day2-recall-fixture.ts
e2e/day2-recall-pin-badge.spec.ts
scripts/test-day2-recall-pin-badge.ts
scripts/test-hub-action-timeline.ts
scripts/test-context-recall-ui.ts
docs/BETA_TEST_GUIDE_KO.md
lib/copy/human-ko.ts                                    (hubActionLog + contextRecall keys)
```

### Verify

```bash
npm run test:day2-recall
npx tsx scripts/test-hub-action-timeline.ts
npx tsx scripts/test-context-recall-ui.ts
npm run test:e2e -- e2e/day2-recall-pin-badge.spec.ts
```

---

## How to split (from current WIP)

```powershell
# 0. Stash or commit everything on a WIP branch first
git checkout -b wip/lodging-vertical-all
git add -A
git commit -m "wip: lodging checkout + room rates + recall"

# 1. PR1 — checkout only
git checkout main
git checkout -b feat/hub-lodging-checkout
git checkout wip/lodging-vertical-all -- app/api/hub lib/globe/hub-checkout lib/identity-vault ...
# (add files from PR1 list above)
git commit -m "feat(globe): in-app lodging checkout"
gh pr create --title "feat(globe): in-app lodging checkout" --body "..."

# 2. PR2 — after PR1 merges
git checkout main && git pull
git checkout -b feat/lodging-live-room-rates
git cherry-pick / checkout files from wip branch ...
gh pr create ...

# 3. PR3 — after PR2 merges
git checkout -b feat/context-recall-day2
...
```

### Shared files (manual merge)

| File | Split strategy |
|------|----------------|
| `lib/copy/human-ko.ts` | PR1: hubCheckout · PR2: lodgingRoomCard* · PR3: hubActionLog |
| `globe-context-hub-rail.tsx` | PR2: room list block · PR3: recall strip + HUB_ACTION_LOG_EVENT |
| `globe-lodging-booking-ui.tsx` | PR1: checkout components · PR2: room offer card |

### Out of scope (separate PRs later)

- Exploration policy / scout feed gate
- Operator turn / discovery lens bulk changes
- Unrelated globe home refactors

---

## Release checklist (all 3 merged)

- [ ] `npm test` green
- [ ] `npm run test:e2e` green (includes Day 2 recall)
- [ ] Beta guide sent via Kakao (`docs/BETA_TEST_GUIDE_KO.md`)
- [ ] LiteAPI sandbox keys in `.env.local` only
