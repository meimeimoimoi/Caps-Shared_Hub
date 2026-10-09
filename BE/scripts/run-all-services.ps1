<#
.SYNOPSIS
    Build va khoi chay dong thoi tat ca cac microservices trong Caps Backend.
.DESCRIPTION
    Script se build Caps.sln, sau do khoi chay cac service theo thu tu:
    1. auth        (identity schema, http://localhost:5194)
    2. billing     (billing schema, http://localhost:5220)
    3. workflow    (workspace & review schemas, http://localhost:5030)
    4. ingestion   (knowledge schema, http://localhost:5004)
    5. gateway     (API gateway, http://localhost:5190)
    6. notification, cronjob, rag-query, read
.EXAMPLE
    .\run-all-services.ps1
.EXAMPLE
    .\run-all-services.ps1 -CoreOnly
#>
param(
    [switch]$CoreOnly = $false, # Chi chay 4 DB services + gateway
    [switch]$NoBuild = $false
)

$ErrorActionPreference = "Stop"
$beRoot = Split-Path -Parent $PSScriptRoot
$slnPath = Join-Path $beRoot "Caps.sln"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       CAPS SHARED HUB - MULTI-SERVICE LAUNCHER           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Build Solution
if (-not $NoBuild) {
    Write-Host "`n[1/3] Dang build Caps.sln..." -ForegroundColor Yellow
    dotnet build $slnPath --nologo -v m
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build that bai. Vui long kiem tra loi tren."
        exit $LASTEXITCODE
    }
    Write-Host "-> Build thanh cong!" -ForegroundColor Green
}

# 2. Danh sach cac service can chay
$dbServices = @(
    @{ Name = "auth";      Port = 5194; Path = (Join-Path $beRoot "auth\auth.csproj") },
    @{ Name = "billing";   Port = 5220; Path = (Join-Path $beRoot "billing\billing.csproj") },
    @{ Name = "workflow";  Port = 5030; Path = (Join-Path $beRoot "workflow\workflow.csproj") },
    @{ Name = "ingestion"; Port = 5004; Path = (Join-Path $beRoot "ingestion\ingestion.csproj") }
)

$otherServices = @(
    @{ Name = "gateway";      Port = 5190; Path = (Join-Path $beRoot "gateway\gateway.csproj") },
    @{ Name = "notification"; Port = 5100; Path = (Join-Path $beRoot "notification\notification.csproj") },
    @{ Name = "cronjob";      Port = 5102; Path = (Join-Path $beRoot "cronjob\cronjob.csproj") },
    @{ Name = "rag-query";    Port = 5104; Path = (Join-Path $beRoot "rag-query\rag-query.csproj") },
    @{ Name = "read";         Port = 5106; Path = (Join-Path $beRoot "read\read.csproj") }
)

$servicesToRun = if ($CoreOnly) {
    $dbServices + @($otherServices[0])
} else {
    $dbServices + $otherServices
}

Write-Host "`n[2/3] Khoi chay cac service trong cua so rieng biet..." -ForegroundColor Yellow

foreach ($svc in $servicesToRun) {
    $svcName = $svc.Name
    $projPath = $svc.Path
    $port = $svc.Port

    Write-Host "  -> Dang bat [$svcName] tren port $port..." -ForegroundColor Cyan

    $command = @"
`$host.UI.RawUI.WindowTitle = '[$svcName] Caps Service - Port $port';
Write-Host '===================================================' -ForegroundColor Green;
Write-Host ' Dang chay: $svcName (Port $port)' -ForegroundColor Green;
Write-Host ' Thu muc:   $projPath' -ForegroundColor DarkGray;
Write-Host '===================================================' -ForegroundColor Green;
dotnet run --project '$projPath' --no-build;
Read-Host 'Service da dung. Nhan Enter de dong...';
"@

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $command
    # Delay nho giua cac service de tranh race condition khi bootstrap DB
    Start-Sleep -Milliseconds 1500
}

Write-Host "`n[3/3] Tat ca cac service da duoc khoi chay!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Danh sach endpoint Swagger / OpenAPI UI:" -ForegroundColor White
Write-Host "  - auth:        http://localhost:5194/openapi-ui" -ForegroundColor Gray
Write-Host "  - billing:     http://localhost:5220/openapi-ui" -ForegroundColor Gray
Write-Host "  - workflow:    http://localhost:5030/openapi-ui" -ForegroundColor Gray
Write-Host "  - ingestion:   http://localhost:5004/openapi-ui" -ForegroundColor Gray
Write-Host "  - gateway:     http://localhost:5190/swagger" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "De dung tat ca cac service: chay .\stop-all-services.ps1" -ForegroundColor Yellow
