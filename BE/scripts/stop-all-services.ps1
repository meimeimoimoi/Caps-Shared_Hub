<#
.SYNOPSIS
    Stops only backend service processes belonging to this repository.
#>
$ErrorActionPreference = "Stop"
$beRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..")).TrimEnd('\') + '\'
$hostNames = @("Caps.Auth.Api.exe", "Caps.Expert.Api.exe", "Caps.Billing.Api.exe", "Caps.Workflow.Api.exe", "ingestion.exe", "gateway.exe", "notification.exe", "cronjob.exe", "rag-query.exe", "read.exe")
# Match executable locations and dotnet run project paths; never stop every dotnet process on the machine.
$processes = Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -in $hostNames -and $_.ExecutablePath -and $_.ExecutablePath.StartsWith($beRoot, [StringComparison]::OrdinalIgnoreCase)) -or
    ($_.Name -eq "dotnet.exe" -and $_.CommandLine -and $_.CommandLine.Contains("--project") -and $_.CommandLine.Replace('/', '\').IndexOf($beRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0)
}
foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}
Write-Host "Stopped $(@($processes).Count) repository backend processes." -ForegroundColor Green
