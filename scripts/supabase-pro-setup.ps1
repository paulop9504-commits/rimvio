# Rimvio — Supabase Pro post-upgrade (Auth URLs + verify)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/supabase-pro-setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$ProdUrl = "https://rimvio.com"
$ProjectRef = "qbvvtzccmiufxgwehdnx"

Write-Host "=== Rimvio Supabase Pro setup ===" -ForegroundColor Cyan

if (-not (Test-Path .env.local)) {
  Write-Host "Missing .env.local — need SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Red
  exit 1
}

Write-Host "`n[1/3] Verify project (Management API)..." -ForegroundColor Yellow
$tokenLine = Select-String -Path .env.local -Pattern "^SUPABASE_ACCESS_TOKEN=" | Select-Object -First 1
if (-not $tokenLine) {
  Write-Host "SUPABASE_ACCESS_TOKEN not in .env.local" -ForegroundColor Red
  exit 1
}
$token = $tokenLine.Line -replace '^SUPABASE_ACCESS_TOKEN=', '' -replace '^"|"$', ''
$headers = @{ Authorization = "Bearer $token" }
$project = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ProjectRef" -Headers $headers
Write-Host "  Name: $($project.name)" -ForegroundColor Green
Write-Host "  Region: $($project.region) (Tokyo = good for Korea)" -ForegroundColor Green
Write-Host "  Status: $($project.status)" -ForegroundColor Green

Write-Host "`n[2/3] Sync Auth Site URL + redirect allow list..." -ForegroundColor Yellow
npx tsx scripts/sync-supabase-auth-urls.ts
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[3/3] Pro dashboard checklist (manual)..." -ForegroundColor Yellow
Write-Host @"
  Dashboard → https://supabase.com/dashboard/project/$ProjectRef

  [ ] Settings → General — project NOT paused (Pro)
  [ ] Settings → Database — daily backups on
  [ ] Settings → Auth → Site URL = $ProdUrl
  [ ] Authentication → URL Configuration — redirect URLs include:
        $ProdUrl/auth/callback
        https://rimvio.vercel.app/auth/callback
  [ ] Project Settings → API — confirm same URL/keys on Vercel env
  [ ] (Optional) Database → Connection pooling — Session mode for serverless

  After rimvio.com DNS Valid on Vercel:
    `"$ProdUrl`" | npx vercel env add NEXT_PUBLIC_APP_URL production --force
    npx vercel deploy --prod --yes
"@ -ForegroundColor DarkGray

Write-Host "`n=== Supabase Pro setup done ===" -ForegroundColor Green
