<#
.SYNOPSIS
    Updates development connection strings and shared internal keys without modifying databases or credentials on servers.
.EXAMPLE
    .\set-connections.ps1 -Service auth -Name Postgres
.EXAMPLE
    .\set-connections.ps1 -Service auth,expert,gateway -Name Redis
.EXAMPLE
    .\set-connections.ps1 -Service workflow,rag-query -Name RagQueryInternalKey
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet('auth', 'expert', 'billing', 'workflow', 'ingestion', 'gateway', 'notification', 'cronjob', 'rag-query', 'read')]
    [string[]]$Service,
    [ValidateSet('Postgres', 'Redis', 'RabbitMq', 'RagQueryInternalKey')]
    [string]$Name = 'Postgres'
)

$ErrorActionPreference = 'Stop'
$beRoot = Split-Path -Parent $PSScriptRoot
$layered = @('auth', 'expert', 'billing', 'workflow')
$databaseServices = @('auth', 'expert', 'billing', 'workflow', 'ingestion', 'notification')

if ($Name -eq 'RagQueryInternalKey') {
    $allowed = @('workflow', 'rag-query')
    foreach ($svc in $Service) {
        if ($svc -notin $allowed) {
            throw "RagQueryInternalKey applies only to 'workflow' and 'rag-query' (got '$svc')."
        }
    }
    $workflowProj = Join-Path $beRoot 'workflow/Api/Api.csproj'
    $ragQueryProj = Join-Path $beRoot 'rag-query/rag-query.csproj'
    foreach ($p in @($workflowProj, $ragQueryProj)) {
        if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { throw "Project not found: $p" }
    }

    # Prompt once and write the same shared key to both workflow and rag-query user-secrets.
    $secure = Read-Host 'Shared internal key (workflow Services:RagQueryInternalKey <-> rag-query InternalApi:Key)' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if ([string]::IsNullOrWhiteSpace($value)) { throw 'Internal key must not be empty.' }

        @{ Services = @{ RagQueryInternalKey = $value } } | ConvertTo-Json -Depth 3 -Compress |
            dotnet user-secrets set --project $workflowProj | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Could not update Services:RagQueryInternalKey for workflow.' }

        @{ InternalApi = @{ Key = $value } } | ConvertTo-Json -Depth 3 -Compress |
            dotnet user-secrets set --project $ragQueryProj | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Could not update InternalApi:Key for rag-query.' }

        Write-Host 'Updated workflow (Services:RagQueryInternalKey) and rag-query (InternalApi:Key). Restart both services to apply.'
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $value = $null
        $secure.Dispose()
    }
    return
}
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
