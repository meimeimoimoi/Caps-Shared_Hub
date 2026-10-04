<#
.SYNOPSIS
    Dung tat ca cac microservices Caps Backend dang chay.
#>
Write-Host "Dang dung cac service Caps Backend..." -ForegroundColor Yellow

$procs = Get-Process -Name "dotnet", "auth", "billing", "workflow", "ingestion", "gateway", "notification", "cronjob", "rag-query", "read" -ErrorAction SilentlyContinue

$count = 0
foreach ($p in $procs) {
    try {
        $p | Stop-Process -Force -ErrorAction SilentlyContinue
        $count++
    } catch {}
}

Write-Host "Da dung $count tien trinh service." -ForegroundColor Green
