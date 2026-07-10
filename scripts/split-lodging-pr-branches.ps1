# Split wip/lodging-vertical-all into 3 stacked PR branches.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/split-lodging-pr-branches.ps1

$ErrorActionPreference = "Stop"
$Wip = "wip/lodging-vertical-all"
$AuthorName = "paul park"
$AuthorEmail = "paulop9504@gmail.com"

$env:GIT_AUTHOR_NAME = $AuthorName
$env:GIT_AUTHOR_EMAIL = $AuthorEmail
$env:GIT_COMMITTER_NAME = $AuthorName
$env:GIT_COMMITTER_EMAIL = $AuthorEmail

function Checkout-WipPaths {
  param([string[]]$Paths)
  foreach ($p in $Paths) {
    git checkout $Wip -- $p 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-Host "warn: could not checkout $p from $Wip"
    }
  }
}

$Pr1Paths = @(
  "app/api/hub",
  "lib/globe/hub-checkout",
  "lib/identity-vault",
  "lib/payment-vault",
  "components/globe/globe-hub-checkout-sheet.tsx",
  "components/globe/globe-express-checkout-sheet.tsx",
  "components/settings/identity-vault-settings-panel.tsx",
  "components/settings/payment-vault-settings-panel.tsx",
  "components/globe/lodging/globe-lodging-booking-ui.tsx",
  "components/peer-chat/my-profile-sheet.tsx",
  "lib/globe/resource/emit-hub-action-with-identity.ts",
  "lib/globe/resource/hub-action-record.ts",
  "lib/globe/resource/context-hub-action-log-metadata.ts",
  "lib/globe/resource/index.ts",
  "lib/globe/context-hub/lodging-resource-types.ts",
  "lib/globe/context-hub/lodging-stay-window.ts",
  "lib/globe/context-hub/lodging-booking-slots.ts",
  "lib/globe/context-hub/build-lodging-booking-slot-chip-labels.ts",
  "lib/globe/context-hub/read-lodging-resource-inventory.ts",
  "lib/globe/context-hub/resolve-lodging-booking-provider.ts",
  "lib/globe/context-hub/providers/liteapi/prebook-liteapi-offer.ts",
  "lib/globe/context-hub/providers/liteapi/book-liteapi-rate.ts",
  "lib/globe/context-hub/providers/liteapi/build-liteapi-guest-payload.ts",
  "lib/globe/context-hub/providers/liteapi/liteapi-config.ts",
  "lib/globe/context-hub/providers/liteapi/liteapi-http.ts",
  "lib/globe/context-hub/providers/liteapi/liteapi-types.ts",
  "lib/globe/context-hub/providers/liteapi/index.ts",
  "lib/vault/types.ts",
  "lib/vault/vault-object-keys.ts",
  "app/api/vault/objects/route.ts",
  ".env.example",
  "docs/RIMVIO_LITEAPI_INTEGRATION.md",
  "docs/RIMVIO_IDENTITY_VAULT.md",
  "docs/GLOBE_HUB_RESOURCE.md",
  "scripts/test-hub-checkout.ts",
  "scripts/test-liteapi-checkout-prep.ts",
  "scripts/test-hub-pg-mode.ts",
  "scripts/test-identity-vault.ts",
  "scripts/test-payment-vault.ts",
  "lib/copy/human-ko.ts",
  "lib/i18n/bundles/en.ts",
  "package.json",
  "package-lock.json",
  "supabase/migrations/065_identity_vault_kinds.sql",
  "supabase/migrations/066_payment_vault_kinds.sql",
  "supabase/sql-editor/07-identity-vault-kinds.sql",
  "supabase/sql-editor/08-payment-vault-kinds.sql"
)

$Pr2Paths = @(
  "lib/globe/context-hub/derive-lodging-room-offers.ts",
  "lib/globe/context-hub/load-lodging-inventory-rows.ts",
  "lib/globe/context-hub/providers/liteapi/attach-liteapi-room-offer-images.ts",
  "lib/globe/context-hub/providers/liteapi/extract-liteapi-room-photos.ts",
  "lib/globe/context-hub/providers/liteapi/fetch-liteapi-hotel-images.ts",
  "lib/globe/context-hub/providers/liteapi/liteapi-hotel-details-types.ts",
  "lib/globe/context-hub/providers/liteapi/map-liteapi-rates-to-inventory.ts",
  "lib/globe/context-hub/providers/liteapi/match-liteapi-room-photos.ts",
  "lib/globe/context-hub/providers/liteapi/search-liteapi-lodging-nearby.ts",
  "app/api/globe/lodging-inventory/route.ts",
  "components/globe/globe-lodging-room-card-list.tsx",
  "components/globe/globe-lodging-booking-slot-chips.tsx",
  "components/globe/globe-lodging-slot-sheet.tsx",
  "components/globe/globe-lodging-focus-stage.tsx",
  "components/globe/globe-assistant-compose-thread.tsx",
  "components/globe/globe-resource-reel-detail.tsx",
  "components/globe/globe-context-hub-rail.tsx",
  "lib/copy/human-ko.ts",
  "scripts/test-lodging-room-offers.ts",
  "scripts/test-lodging-price-consistency.ts",
  "scripts/test-lodging-booking-p0.ts",
  "scripts/test-liteapi-room-offer-images.ts",
  "scripts/test-liteapi-lodging-search.ts",
  "scripts/test-lodging-scout-checkout-e2e.ts"
)

$Pr3Paths = @(
  "lib/globe/enrich-globe-pin-recall-badge.ts",
  "lib/globe/context-hub/summarize-context-recall.ts",
  "lib/globe/resource/format-hub-action-timeline.ts",
  "components/globe/globe-context-recall-badge.tsx",
  "components/globe/globe-context-hub-action-strip.tsx",
  "components/globe/globe-context-hub-rail.tsx",
  "lib/globe/create-globe-3d-pin-element.ts",
  "lib/feed/experience-globe-ping-types.ts",
  "components/experience/rimvio-globe-hub.tsx",
  "lib/test/e2e-day2-recall-fixture.ts",
  "e2e/day2-recall-pin-badge.spec.ts",
  "scripts/test-day2-recall-pin-badge.ts",
  "scripts/test-hub-action-timeline.ts",
  "scripts/test-context-recall-ui.ts",
  "docs/BETA_TEST_GUIDE_KO.md",
  "docs/PR_SPLIT_WIP.md",
  "lib/copy/human-ko.ts",
  "package.json"
)

Write-Host "=== PR1: feat/hub-lodging-checkout ==="
git checkout main
if (git branch --list feat/hub-lodging-checkout) { git branch -D feat/hub-lodging-checkout | Out-Null }
git checkout -b feat/hub-lodging-checkout
Checkout-WipPaths $Pr1Paths
git add -A
git commit -m "feat(globe): in-app lodging checkout (LiteAPI, PG, Identity Vault)"

Write-Host "=== PR2: feat/lodging-live-room-rates (stacked on PR1) ==="
if (git branch --list feat/lodging-live-room-rates) { git branch -D feat/lodging-live-room-rates | Out-Null }
git checkout -b feat/lodging-live-room-rates
Checkout-WipPaths $Pr2Paths
git add -A
git commit -m "feat(globe): LiteAPI live room rates and room photo mapping"

Write-Host "=== PR3: feat/context-recall-day2 (stacked on PR2) ==="
if (git branch --list feat/context-recall-day2) { git branch -D feat/context-recall-day2 | Out-Null }
git checkout -b feat/context-recall-day2
Checkout-WipPaths $Pr3Paths
git add -A
git commit -m "feat(globe): post-checkout recall badge, action log strip, Day 2 E2E"

Write-Host ""
Write-Host "Done. Branches:"
git branch --list "feat/hub-lodging-checkout" "feat/lodging-live-room-rates" "feat/context-recall-day2" "wip/lodging-vertical-all"
Write-Host ""
git log --oneline --graph main..feat/context-recall-day2
