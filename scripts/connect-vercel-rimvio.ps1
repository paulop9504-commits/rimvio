# Connect Vercel project `rimvio` to GitHub paulop9504-dotcom/rimvio
# Usage: powershell -ExecutionPolicy Bypass -File scripts/connect-vercel-rimvio.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$RimvioRepo = "https://github.com/paulop9504-dotcom/rimvio.git"
$Project = "rimvio"
$VercelTeam = "yong-s-projects17"
$VercelOrgId = "team_CYLDDTKnNE4LPDnyNWqLBtEF"
$VercelProjectId = "prj_EStrLHbcj31DupQI87NMdDRNJSMD"
$ProdUrl = "https://rimvio.vercel.app"

Write-Host "=== Vercel <-> rimvio Git connect ===" -ForegroundColor Cyan

if (-not (Test-Path .vercel\project.json)) {
  New-Item -ItemType Directory -Force -Path .vercel | Out-Null
  @"
{
  "orgId": "$VercelOrgId",
  "projectId": "$VercelProjectId"
}
"@ | Set-Content -Path .vercel\project.json -Encoding utf8
}

npx vercel link --yes --project $Project --scope $VercelTeam

Write-Host "`nDisconnect legacy glango (if connected)..." -ForegroundColor Yellow
npx vercel git disconnect --yes 2>$null

Write-Host "Connect rimvio repo..." -ForegroundColor Yellow
npx vercel git connect $RimvioRepo --yes

Write-Host "`nDone." -ForegroundColor Green
Write-Host "Project: $Project"
Write-Host "Git:     paulop9504-dotcom/rimvio"
Write-Host "Prod:    $ProdUrl"
Write-Host ""
Write-Host "Branches:"
Write-Host "  main                    -> Production"
Write-Host "  release/v1-rimvio-core  -> Preview"
Write-Host "Verify: npm run verify:pipeline && git push origin release/v1-rimvio-core"
