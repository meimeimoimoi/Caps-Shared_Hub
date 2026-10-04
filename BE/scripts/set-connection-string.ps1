<#
.SYNOPSIS
    Cập nhật Connection String PostgreSQL cho toàn bộ các service trong BE mà không làm hỏng format JSON.
.EXAMPLE
    .\set-connection-string.ps1 -Password "12345"
.EXAMPLE
    .\set-connection-string.ps1 -Database "shared_hub_db" -Password "12345"
.EXAMPLE
    .\set-connection-string.ps1 -ConnectionString "Host=localhost;Port=5432;Database=shared_hub_db;Username=postgres;Password=12345"
#>
param(
    [string]$HostName = "localhost",
    [int]$Port = 5432,
    [string]$Database = "shared_hub_db",
    [string]$Username = "postgres",
    [string]$Password,
    [string]$ConnectionString
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
    if ([string]::IsNullOrWhiteSpace($Password)) {
        $Password = Read-Host "Nhap mat khau PostgreSQL cho user '$Username' (mac dinh 12345)"
        if ([string]::IsNullOrWhiteSpace($Password)) {
            $Password = "12345"
        }
    }
    $ConnectionString = "Host=$HostName;Port=$Port;Database=$Database;Username=$Username;Password=$Password"
}

Write-Host "== Cap nhat chuoi ket noi PostgreSQL ==" -ForegroundColor Cyan
Write-Host "Chuoi ket noi: $ConnectionString" -ForegroundColor Yellow

$beRoot = Split-Path -Parent $PSScriptRoot
$services = @("auth", "billing", "workflow", "ingestion", "notification", "cronjob", "gateway", "rag-query", "read")

foreach ($svc in $services) {
    $svcDir = Join-Path $beRoot $svc
    if (-not (Test-Path $svcDir)) { continue }

    $file = Join-Path $svcDir "appsettings.json"
    if (Test-Path $file) {
        $content = Get-Content -Path $file -Raw -Encoding UTF8

        if ($content -match '("Postgres"\s*:\s*")([^"]*)(")') {
            # Giữ nguyên 100% format đẹp của file, chỉ thay giá trị connection string
            $newContent = [regex]::Replace($content, '("Postgres"\s*:\s*")([^"]*)(")', "`${1}$ConnectionString`${3}")
            Set-Content -Path $file -Value $newContent -Encoding UTF8
            Write-Host "  [OK] Da cap nhat: $svc / appsettings.json" -ForegroundColor Green
        }
    }
}

Write-Host "== Hoan tat cap nhat chuoi ket noi! ==" -ForegroundColor Green
