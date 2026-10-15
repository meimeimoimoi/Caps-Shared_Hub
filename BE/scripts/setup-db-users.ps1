<#
.SYNOPSIS
    Creates one PostgreSQL role per service (owner of its own schemas only) and stores each
    service's connection string in its user-secrets, so no password lives in appsettings.json.
.DESCRIPTION
    Run once per machine with an admin account; run again to rotate every service password.
    Restart the services afterwards so they pick up the new connection strings.
.EXAMPLE
    .\setup-db-users.ps1
.EXAMPLE
    .\setup-db-users.ps1 -Database shared_hub_db -AdminUser postgres
.EXAMPLE
    .\setup-db-users.ps1 -Container caps_postgres -Database caps_db
    Runs psql inside the docker-compose Postgres container (no local psql needed).
#>
param(
    [string]$HostName = "localhost",
    [int]$Port = 5432,
    [string]$Database = "shared_hub_db",
    [string]$AdminUser = "postgres",
    [string]$Psql,
    [string]$Container
)

$ErrorActionPreference = "Stop"
$beRoot = Split-Path -Parent $PSScriptRoot
$sqlDir = Join-Path $PSScriptRoot "db"

# Service role, the schemas it owns, and the project that reads ConnectionStrings:Postgres
$services = @(
    @{ Role = "caps_auth";      Schemas = @("identity");             Project = "auth\Api" },
    @{ Role = "caps_expert";    Schemas = @("expert");               Project = "expert\Api" },
    @{ Role = "caps_billing";   Schemas = @("billing");              Project = "billing\Api" },
    @{ Role = "caps_workflow";  Schemas = @("workspace", "review");  Project = "workflow\Api" },
    @{ Role = "caps_ingestion"; Schemas = @("knowledge");            Project = "ingestion" }
)

if (-not $Psql -and -not $Container) {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) {
        $Psql = $cmd.Source
    } else {
        $Psql = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
    }
}
if (-not $Psql -and -not $Container) {
    throw "psql not found. Install the PostgreSQL client, pass -Psql <path-to-psql.exe>, or -Container caps_postgres."
}

if (-not $env:PGPASSWORD) {
    $secure = Read-Host "Password for PostgreSQL admin '$AdminUser'" -AsSecureString
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

# "already exists, skipping" notices go to stderr, which Windows PowerShell may treat as an error
$env:PGOPTIONS = "--client-min-messages=warning"

# Runs one SQL file from scripts/db with the given psql variables
function Invoke-SqlFile([string]$Db, [string]$File, [hashtable]$Vars) {
    $psqlArgs = @("-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", $AdminUser, "-d", $Db)
    foreach ($key in $Vars.Keys) { $psqlArgs += @("-v", "$key=$($Vars[$key])") }
    $path = Join-Path $sqlDir $File
    if ($Container) {
        Get-Content $path -Raw | docker exec -i -e PGPASSWORD -e PGOPTIONS $Container psql @psqlArgs -f -
    } else {
        & $Psql -h $HostName -p $Port @psqlArgs -f $path
    }
    if ($LASTEXITCODE -ne 0) { throw "psql failed on $File (exit code $LASTEXITCODE)." }
}

function New-Password {
    $bytes = New-Object byte[] 24
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    # Hex keeps the password free of characters that need escaping in a connection string
    return -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

Write-Host "== Database $Database on ${HostName}:$Port ==" -ForegroundColor Cyan
Invoke-SqlFile "postgres" "create-database.sql" @{ dbname = $Database }
Invoke-SqlFile $Database "database.sql" @{ dbname = $Database }

foreach ($svc in $services) {
    $password = New-Password
    foreach ($schema in $svc.Schemas) {
        Invoke-SqlFile $Database "service-role.sql" @{
            dbname = $Database; role = $svc.Role; schema = $schema; password = $password
        }
    }
    $connection = "Host=$HostName;Port=$Port;Database=$Database;Username=$($svc.Role);Password=$password"
    $project = Join-Path $beRoot $svc.Project
    dotnet user-secrets set "ConnectionStrings:Postgres" $connection --project $project | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not set user-secrets for $($svc.Project)." }
    Write-Host ("  [OK] {0,-15} owns {1}" -f $svc.Role, ($svc.Schemas -join ", ")) -ForegroundColor Green
}

Write-Host "Done. Restart the services to use the new connection strings." -ForegroundColor Green
