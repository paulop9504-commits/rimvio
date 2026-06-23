# Rimvio — Vercel Pro post-upgrade setup (env + domain checklist)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/vercel-pro-setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$Project = "rimvio"
$ProdUrl = "https://rimvio.vercel.app"
$CustomDomain = "https://rimvio.com"

Write-Host "=== Rimvio Vercel Pro setup ===" -ForegroundColor Cyan

Write-Host "`n[1/4] Link project..." -ForegroundColor Yellow
npx vercel link --yes --project $Project | Out-Null

Write-Host "`n[2/4] Set NEXT_PUBLIC_APP_URL (required for OAuth)..." -ForegroundColor Yellow
$ProdUrl | npx vercel env add NEXT_PUBLIC_APP_URL production --force | Out-Null
$ProdUrl | npx vercel env add NEXT_PUBLIC_APP_URL preview --force | Out-Null
"http://localhost:3000" | npx vercel env add NEXT_PUBLIC_APP_URL development --force | Out-Null
Write-Host "  Production: $ProdUrl" -ForegroundColor Green
Write-Host "  After rimvio.app DNS is Valid, run:" -ForegroundColor DarkGray
Write-Host "    echo $CustomDomain | npx vercel env add NEXT_PUBLIC_APP_URL production --force" -ForegroundColor DarkGray

Write-Host "`n[3/4] Pull production env..." -ForegroundColor Yellow
npx vercel env pull .env.vercel.production --environment=production --yes | Out-Null

Write-Host "`n[4/4] Redeploy production (NEXT_PUBLIC_* needs rebuild)..." -ForegroundColor Yellow
npx vercel deploy --prod --yes
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n=== Pro setup done ===" -ForegroundColor Green
Write-Host "Live URL: $ProdUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Custom domain (manual — domain registrar):" -ForegroundColor Cyan
Write-Host "  1. Vercel → rimvio → Settings → Domains → Add rimvio.app"
Write-Host "  2. Registrar DNS: A @ → 216.198.79.1 (or IP shown in Vercel UI)"
Write-Host "  3. Optional www: CNAME www → cname.vercel-dns.com"
Write-Host "  4. When Valid: switch NEXT_PUBLIC_APP_URL to $CustomDomain + redeploy"
Write-Host "  5. Supabase Auth: npx tsx scripts/sync-supabase-auth-urls.ts"
Write-Host "  6. Capacitor: `$env:CAPACITOR_SERVER_URL='$CustomDomain'; npm run store:prepare:ios"
