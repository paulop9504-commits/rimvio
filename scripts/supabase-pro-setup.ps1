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

Write-Host "`n[3/3] Pro performance checklist..." -ForegroundColor Yellow
Write-Host @"
  Dashboard → https://supabase.com/dashboard/project/$ProjectRef

  Auth / URLs
  [ ] Settings → General — project NOT paused (Pro)
  [ ] Settings → Auth → Site URL = $ProdUrl
  [ ] Authentication → URL Configuration — redirect URLs include:
        $ProdUrl/auth/callback
        https://rimvio.vercel.app/auth/callback

  Compute / Pool (use Pro capacity — don't stay on Micro forever)
  [ ] Settings → Infrastructure → Compute ≥ Small (Medium recommended for travel Workspace)
        or: powershell -File scripts/supabase-boost-performance.ps1 -Compute medium
  [ ] Database → Connection pooling — Transaction mode · pool size ~40% of max_connections
  [ ] Settings → API → PostgREST DB pool — raise with compute, leave headroom for Auth

  After rimvio.com DNS Valid on Vercel:
    `"$ProdUrl`" | npx vercel env add NEXT_PUBLIC_APP_URL production --force
    npx vercel deploy --prod --yes
"@ -ForegroundColor DarkGray

Write-Host "`n=== Supabase Pro setup done ===" -ForegroundColor Green
