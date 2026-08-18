# Connect Vercel team yong-s-projects17 / project rimvio to this repo + GitHub
# Usage:
#   1) Create token: https://vercel.com/account/tokens
#   2) $env:VERCEL_TOKEN = "..."   # or put token in .vercel-token.local (gitignored)
#   3) powershell -ExecutionPolicy Bypass -File scripts/connect-vercel-rimvio.ps1
#
# Note: `vercel login` fails on Korean Windows PC names — token auth only.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$Scope = "yong-s-projects17"
$RimvioRepo = "https://github.com/paulop9504-commits/rimvio.git"
$Project = "rimvio"
$ProdUrl = "https://rimvio.vercel.app"
$TokenFile = Join-Path $PSScriptRoot "..\.vercel-token.local"

if (-not $env:VERCEL_TOKEN -and (Test-Path $TokenFile)) {
  $env:VERCEL_TOKEN = (Get-Content $TokenFile -Raw).Trim()
}
if (-not $env:VERCEL_TOKEN) {
  Write-Host "Missing VERCEL_TOKEN." -ForegroundColor Red
  Write-Host "  Create: https://vercel.com/account/tokens"
  Write-Host "  Then:   `$env:VERCEL_TOKEN = 'your-token'"
  Write-Host "  Or save token (one line) to: .vercel-token.local"
  exit 1
}

Write-Host "=== Vercel <-> rimvio connect (scope: $Scope) ===" -ForegroundColor Cyan

Write-Host "`n[1/4] Auth check..." -ForegroundColor Yellow
npx vercel whoami --token $env:VERCEL_TOKEN 2>&1 | Select-Object -First 5
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[2/4] Link local repo..." -ForegroundColor Yellow
npx vercel link --yes --scope $Scope --project $Project --token $env:VERCEL_TOKEN
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[3/4] Git connect (rimvio repo)..." -ForegroundColor Yellow
npx vercel git disconnect --yes --token $env:VERCEL_TOKEN 2>$null
npx vercel git connect $RimvioRepo --yes --token $env:VERCEL_TOKEN
if ($LASTEXITCODE -ne 0) {
  Write-Host "Git connect failed — link in dashboard: Project rimvio → Settings → Git" -ForegroundColor Yellow
}

Write-Host "`n[4/4] Pull production env (optional)..." -ForegroundColor Yellow
npx vercel env pull .env.vercel.production --environment=production --yes --token $env:VERCEL_TOKEN 2>$null

Write-Host "`nDone." -ForegroundColor Green
Write-Host "Team:    $Scope"
Write-Host "Project: $Project"
Write-Host "Git:     paulop9504-commits/rimvio"
Write-Host "Prod:    $ProdUrl"
Write-Host "Local:   .vercel/project.json"
Write-Host ""
Write-Host "Branches:"
Write-Host "  main                    -> Production"
Write-Host "  release/v1-rimvio-core  -> Preview"
Write-Host "Verify: npm run verify:pipeline && git push origin release/v1-rimvio-core"
