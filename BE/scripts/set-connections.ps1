<#
.SYNOPSIS
    Updates development connection strings without modifying databases or credentials on servers.
.EXAMPLE
    .\set-connections.ps1 -Service auth -Name Postgres
.EXAMPLE
    .\set-connections.ps1 -Service auth,expert,gateway -Name Redis
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet('auth', 'expert', 'billing', 'workflow', 'ingestion', 'gateway', 'notification', 'cronjob', 'rag-query', 'read')]
    [string[]]$Service,
    [ValidateSet('Postgres', 'Redis', 'RabbitMq')]
    [string]$Name = 'Postgres'
)

$ErrorActionPreference = 'Stop'
$beRoot = Split-Path -Parent $PSScriptRoot
$layered = @('auth', 'expert', 'billing', 'workflow')
$databaseServices = @('auth', 'expert', 'billing', 'workflow', 'ingestion', 'notification')
$projects = @()
foreach ($serviceName in ($Service | Select-Object -Unique)) {
    if ($Name -eq 'Postgres' -and $serviceName -notin $databaseServices) {
        throw "$serviceName does not currently use PostgreSQL."
    }
    $relative = if ($serviceName -in $layered) { "$serviceName/Api/Api.csproj" } else { "$serviceName/$serviceName.csproj" }
    $path = Join-Path $beRoot $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Project not found: $path" }
    [xml]$projectXml = Get-Content -LiteralPath $path -Raw
    if (-not $projectXml.SelectSingleNode('//UserSecretsId')) { throw "UserSecretsId missing: $relative" }
    $projects += [pscustomobject]@{ Name = $serviceName; Path = $path }
}

foreach ($project in $projects) {
    # Read each service separately so PostgreSQL roles remain isolated. Do not print secrets or put them in process arguments.
    $secure = Read-Host "ConnectionStrings:$Name for $($project.Name)" -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if ([string]::IsNullOrWhiteSpace($value)) { throw 'Connection string must not be empty.' }
        @{ ConnectionStrings = @{ $Name = $value } } | ConvertTo-Json -Depth 3 -Compress |
            dotnet user-secrets set --project $project.Path | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Could not update connection for $($project.Name)." }
        Write-Host "Updated $($project.Name): ConnectionStrings:$Name. Restart the service to apply."
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $value = $null
        $secure.Dispose()
    }
}
