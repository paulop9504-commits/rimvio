# Rimvio — bump Supabase Pro compute + print performance checklist
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # Dashboard → Account → Access Tokens
#   powershell -ExecutionPolicy Bypass -File scripts/supabase-boost-performance.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/supabase-boost-performance.ps1 -Compute medium
#
# Defaults to Medium (4GB RAM) — real Pro headroom without jumping to dedicated Large ($110).
# Compute change = ~1–2 min downtime.

param(
  [ValidateSet("small", "medium", "large")]
  [string]$Compute = "medium",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$ProjectRef = "qbvvtzccmiufxgwehdnx"
$variant = "ci_$Compute"

$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token -and (Test-Path .env.local)) {
  $line = Select-String -Path .env.local -Pattern "^SUPABASE_ACCESS_TOKEN=" | Select-Object -First 1
  if ($line) {
    $token = ($line.Line -replace '^SUPABASE_ACCESS_TOKEN=', '').Trim().Trim('"')
  }
}
if (-not $token) {
  Write-Host @"
Missing SUPABASE_ACCESS_TOKEN.

1) https://supabase.com/dashboard/account/tokens  → Generate token
2) `$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
   or add to .env.local: SUPABASE_ACCESS_TOKEN=sbp_...
3) Re-run this script

Or manually (same effect):
  https://supabase.com/dashboard/project/$ProjectRef/settings/infrastructure
  → Compute size → $($Compute.Substring(0,1).ToUpper()+$Compute.Substring(1)) → Save
"@ -ForegroundColor Yellow
  exit 1
}

$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "=== Rimvio Supabase Pro performance boost ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectRef  target: $variant" -ForegroundColor DarkGray

$project = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ProjectRef" -Headers $headers
Write-Host "Name: $($project.name) · Region: $($project.region) · Status: $($project.status)" -ForegroundColor Green

$addons = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ProjectRef/billing/addons" -Headers $headers
$current = $addons.selected_addons |
  Where-Object { $_.type -eq "compute_instance" } |
  Select-Object -First 1
if ($current) {
  Write-Host "Current compute: $($current.variant.id)" -ForegroundColor Green
  if ($current.variant.id -eq $variant) {
    Write-Host "Already on $variant — skipping resize." -ForegroundColor Yellow
  } else {
    $body = @{
      addon_type    = "compute_instance"
      addon_variant = $variant
    } | ConvertTo-Json
    Write-Host "`nResize $(($current.variant.id)) → $variant (~1–2 min downtime)..." -ForegroundColor Yellow
    if ($DryRun) {
      Write-Host "[dry-run] PATCH body: $body" -ForegroundColor DarkGray
    } else {
      Invoke-RestMethod `
        -Method Patch `
        -Uri "https://api.supabase.com/v1/projects/$ProjectRef/billing/addons" `
        -Headers $headers `
        -Body $body | Out-Null
      Write-Host "Resize requested. Wait until project is ACTIVE_HEALTHY." -ForegroundColor Green
      for ($i = 0; $i -lt 36; $i++) {
        Start-Sleep -Seconds 5
        $p = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ProjectRef" -Headers $headers
        Write-Host "  status=$($p.status)" -ForegroundColor DarkGray
        if ($p.status -eq "ACTIVE_HEALTHY") { break }
      }
    }
  }
} else {
  Write-Host "Could not read current compute addon — still applying $variant..." -ForegroundColor Yellow
  if (-not $DryRun) {
    $body = @{
      addon_type    = "compute_instance"
      addon_variant = $variant
    } | ConvertTo-Json
    Invoke-RestMethod `
      -Method Patch `
      -Uri "https://api.supabase.com/v1/projects/$ProjectRef/billing/addons" `
      -Headers $headers `
      -Body $body | Out-Null
  }
}

Write-Host "`n=== Dashboard knobs (do these once) ===" -ForegroundColor Cyan
Write-Host @"
Infrastructure
  https://supabase.com/dashboard/project/$ProjectRef/settings/infrastructure
  [x] Compute = $($Compute.ToUpper())   (this script)
  [ ] Disk gp3 — leave default unless Disk IO % consumed is high
  [ ] PITR — enable if you want point-in-time restore (Pro+)

Database → Connection pooling
  https://supabase.com/dashboard/project/$ProjectRef/database/settings
  [ ] Pool Mode = Transaction (serverless / Vercel) or Session (long psql)
  [ ] Pool Size ≈ 40% of DB max connections (Medium → try 40–50)
      Micro max_conn≈60 → pool≤24
      Small  max_conn≈90 → pool≤36
      Medium max_conn≈120 → pool≤48

API (PostgREST)
  https://supabase.com/dashboard/project/$ProjectRef/settings/api
  [ ] DB Pool Size — raise carefully with compute (don't starve Auth)

Observability
  https://supabase.com/dashboard/project/$ProjectRef/observability
  Watch CPU / Memory / Disk IO % after resize under real Globe+Workspace load.

Cost note (approx, Pro org compute credit \$10/mo applies to first Micro):
  Small  ~\$15/mo · Medium ~\$60/mo · Large ~\$110/mo (dedicated CPU)
"@ -ForegroundColor DarkGray

Write-Host "`nDone." -ForegroundColor Green
