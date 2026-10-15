<#
.SYNOPSIS
    Builds and starts the ten backend services in the background.
.DESCRIPTION
    Builds Caps.sln, then starts database services and the remaining hosts:
    1. auth        (identity schema, http://localhost:5194)
    2. expert (http://localhost:5198), billing     (billing schema, http://localhost:5220)
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
    [switch]$CoreOnly = $false, # Start the five database services and gateway
    [switch]$NoBuild = $false
)

$ErrorActionPreference = "Stop"
$beRoot = Split-Path -Parent $PSScriptRoot
$slnPath = Join-Path $beRoot "Caps.sln"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       CAPS SHARED HUB - MULTI-SERVICE LAUNCHER           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Build the solution.
if (-not $NoBuild) {
    Write-Host "`n[1/3] Dang build Caps.sln..." -ForegroundColor Yellow
    dotnet build $slnPath --nologo -v m
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build that bai. Vui long kiem tra loi tren."
        exit $LASTEXITCODE
    }
    Write-Host "-> Build thanh cong!" -ForegroundColor Green
}

# Projects use the current layered and single-project service layouts.
$dbServices = @(
    @{ Name = "auth";      Port = 5194; Path = (Join-Path $beRoot "auth\Api\Api.csproj") },
    @{ Name = "expert";    Port = 5198; Path = (Join-Path $beRoot "expert\Api\Api.csproj") },
    @{ Name = "billing";   Port = 5220; Path = (Join-Path $beRoot "billing\Api\Api.csproj") },
    @{ Name = "workflow";  Port = 5030; Path = (Join-Path $beRoot "workflow\Api\Api.csproj") },
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

Write-Host "`n[2/3] Khoi chay cac service o nen..." -ForegroundColor Yellow

# Validate every selected project before starting any service.
foreach ($svc in $servicesToRun) {
    if (-not (Test-Path -LiteralPath $svc.Path -PathType Leaf)) {
        throw "Project not found: $($svc.Path)"
    }
}
$logDir = Join-Path $beRoot "..\.tmp\services"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
foreach ($svc in $servicesToRun) {
    $svcName = $svc.Name
    $port = $svc.Port
    Write-Host "Starting $svcName on http://localhost:$port" -ForegroundColor Cyan
    # Explicit URLs keep the standard ports independent of launch profiles and prevent browser windows.
    $arguments = @("run", "--project", ('"' + $svc.Path + '"'), "--no-build", "--no-launch-profile", "--", "--urls", "http://localhost:$port")
    $previousEnvironment = $env:ASPNETCORE_ENVIRONMENT
    try {
        $env:ASPNETCORE_ENVIRONMENT = "Development"
        $process = Start-Process -FilePath dotnet -ArgumentList $arguments -WorkingDirectory $beRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir "$svcName.log") -RedirectStandardError (Join-Path $logDir "$svcName.error.log")
        Write-Host "  PID $($process.Id); logs: $logDir"
    } finally {
        $env:ASPNETCORE_ENVIRONMENT = $previousEnvironment
    }
}
Write-Host "`n[3/3] Da gui lenh khoi chay. Kiem tra log va /readyz de xac nhan!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Danh sach endpoint Swagger / OpenAPI UI:" -ForegroundColor White
Write-Host "  - auth:        http://localhost:5194/openapi-ui" -ForegroundColor Gray
Write-Host "  - expert:      http://localhost:5198/openapi-ui" -ForegroundColor Gray
Write-Host "  - billing:     http://localhost:5220/openapi-ui" -ForegroundColor Gray
Write-Host "  - workflow:    http://localhost:5030/openapi-ui" -ForegroundColor Gray
Write-Host "  - ingestion:   http://localhost:5004/openapi-ui" -ForegroundColor Gray
Write-Host "  - gateway:     http://localhost:5190/swagger" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "De dung tat ca cac service: chay .\stop-all-services.ps1" -ForegroundColor Yellow
