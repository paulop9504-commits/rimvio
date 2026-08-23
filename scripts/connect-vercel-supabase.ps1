# Connect local Rimvio to existing Vercel + Supabase projects.
# Usage:
#   $env:VERCEL_TOKEN = "..."            # https://vercel.com/account/tokens
#   $env:SUPABASE_ACCESS_TOKEN = "..."   # https://supabase.com/dashboard/account/tokens
#   powershell -ExecutionPolicy Bypass -File scripts/connect-vercel-supabase.ps1
#
# Optional: put the same vars in .env.local (uncommented).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$Project = "rimvio"
$VercelTeam = "yong-s-projects17"
$VercelOrgId = "team_CYLDDTKnNE4LPDnyNWqLBtEF"
$VercelProjectId = "prj_EStrLHbcj31DupQI87NMdDRNJSMD"
$RimvioRepo = "https://github.com/paulop9504-dotcom/rimvio.git"
$SupabaseRef = "qbvvtzccmiufxgwehdnx"
$ProdUrl = "https://rimvio.vercel.app"

function Read-DotEnvValue([string]$key) {
  if (-not (Test-Path .env.local)) { return $null }
  $line = Select-String -Path .env.local -Pattern "^$key=" | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line.Line -replace "^$key=", "").Trim().Trim('"').Trim("'")
}

# ASCII hostname workaround: Korean Windows computer names break Vercel CLI headers.
$env:COMPUTERNAME = "paulo-pc"
$env:HOSTNAME = "paulo-pc"
$env:USERDOMAIN = "WORKGROUP"
$env:NO_COLOR = "1"

if (-not $env:VERCEL_TOKEN) { $env:VERCEL_TOKEN = Read-DotEnvValue "VERCEL_TOKEN" }
if (-not $env:SUPABASE_ACCESS_TOKEN) { $env:SUPABASE_ACCESS_TOKEN = Read-DotEnvValue "SUPABASE_ACCESS_TOKEN" }

Write-Host "=== Rimvio Vercel + Supabase connect ===" -ForegroundColor Cyan

if (-not $env:VERCEL_TOKEN) {
  Write-Host "Missing VERCEL_TOKEN" -ForegroundColor Red
  Write-Host "Create at https://vercel.com/account/tokens then set `$env:VERCEL_TOKEN"
  exit 1
}
if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "Missing SUPABASE_ACCESS_TOKEN" -ForegroundColor Red
  Write-Host "Create at https://supabase.com/dashboard/account/tokens then set `$env:SUPABASE_ACCESS_TOKEN"
  exit 1
}

Write-Host "`n[1/5] Vercel whoami..." -ForegroundColor Yellow
npx vercel whoami --no-color
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[2/5] Link Vercel project '$Project' (team $VercelTeam)..." -ForegroundColor Yellow
if (-not (Test-Path .vercel\project.json)) {
  New-Item -ItemType Directory -Force -Path .vercel | Out-Null
  @"
{
  "orgId": "$VercelOrgId",
  "projectId": "$VercelProjectId"
}
"@ | Set-Content -Path .vercel\project.json -Encoding utf8
}
npx vercel link --yes --project $Project --scope $VercelTeam --no-color
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[3/5] Connect GitHub repo..." -ForegroundColor Yellow
npx vercel git disconnect --yes 2>$null
npx vercel git connect $RimvioRepo --yes --no-color
if ($LASTEXITCODE -ne 0) {
  Write-Host "Git connect failed (may already be linked) — continue" -ForegroundColor DarkYellow
}

Write-Host "`n[4/5] Pull Vercel production env..." -ForegroundColor Yellow
npx vercel env pull .env.vercel.production --environment=production --yes --no-color
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[5/5] Link Supabase project $SupabaseRef..." -ForegroundColor Yellow
npx supabase link --project-ref $SupabaseRef --yes
if ($LASTEXITCODE -ne 0) { exit 1 }

# Merge core public keys into .env.local if missing
$core = @{
  "NEXT_PUBLIC_SUPABASE_URL" = "https://$SupabaseRef.supabase.co"
  "SUPABASE_PROJECT_REF" = $SupabaseRef
  "NEXT_PUBLIC_APP_URL" = "http://localhost:3000"
}
foreach ($k in $core.Keys) {
  if (-not (Read-DotEnvValue $k)) {
    Add-Content -Path .env.local -Value "$k=$($core[$k])"
  }
}

Write-Host "`n=== Connected ===" -ForegroundColor Green
Write-Host "Vercel:   $ProdUrl (project $Project)"
Write-Host "Supabase: https://supabase.com/dashboard/project/$SupabaseRef"
Write-Host "Env pull: .env.vercel.production"
Write-Host "Local:    .env.local (public keys ready; copy SERVICE_ROLE from Vercel env if needed)"
