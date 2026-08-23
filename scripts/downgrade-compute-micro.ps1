# Downgrade Supabase compute to Micro via Management API.
# Requires SUPABASE_ACCESS_TOKEN (from `supabase login` or Dashboard access token).

param(
  [string]$ProjectRef = "qbvvtzccmiufxgwehdnx",
  [string]$TargetVariant = "ci_micro"
)

$ErrorActionPreference = "Stop"

function Get-AccessToken {
  if ($env:SUPABASE_ACCESS_TOKEN) { return $env:SUPABASE_ACCESS_TOKEN }

  $paths = @(
    "$env:APPDATA\supabase\access-token",
    "$env:USERPROFILE\.supabase\access-token"
  )
  foreach ($p in $paths) {
    if (Test-Path $p) {
      return (Get-Content $p -Raw).Trim()
    }
  }

  $envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
      if ($line -match '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.+)\s*$') {
        $token = $Matches[1].Trim().Trim('"').Trim("'")
        if ($token) { return $token }
      }
    }
  }

  throw "No Supabase access token. Run: supabase login"
}

$token = Get-AccessToken
$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}

$base = "https://api.supabase.com/v1/projects/$ProjectRef/billing/addons"

Write-Host "Checking current compute..."
$current = Invoke-RestMethod -Uri $base -Headers $headers -Method Get
$active = $current.addons | Where-Object { $_.type -eq "compute_instance" -and $_.selected -eq $true } | Select-Object -First 1
if ($active) {
  Write-Host "Current compute: $($active.variant.name) ($($active.variant.identifier))"
  if ($active.variant.identifier -eq $TargetVariant) {
    Write-Host "Already on Micro. Nothing to do."
    exit 0
  }
} else {
  Write-Host "No active compute addon found; applying $TargetVariant..."
}

$body = @{
  addon_type    = "compute_instance"
  addon_variant = $TargetVariant
} | ConvertTo-Json

Write-Host "Downgrading to Micro ($TargetVariant). Expect ~2 min downtime..."
Invoke-RestMethod -Uri $base -Headers $headers -Method Patch -Body $body | Out-Null

Start-Sleep -Seconds 5
$after = Invoke-RestMethod -Uri $base -Headers $headers -Method Get
$updated = $after.addons | Where-Object { $_.type -eq "compute_instance" -and $_.selected -eq $true } | Select-Object -First 1
if ($updated.variant.identifier -eq $TargetVariant) {
  Write-Host "Done. Compute is now: $($updated.variant.name)"
  exit 0
}

Write-Host "Patch sent. Verify in Dashboard:"
Write-Host "https://supabase.com/dashboard/project/$ProjectRef/settings/infrastructure"
exit 0
