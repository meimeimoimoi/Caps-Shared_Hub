# Full-stack startup (infra + auth + gateway)
param([switch]$Build = $true)

$ErrorActionPreference = 'Stop'
$compose = Join-Path $PSScriptRoot '..\docker\docker-compose.yml'

Write-Host '== Caps Shared Hub: starting infra (postgres/redis/rabbit) ==' -ForegroundColor Green
docker compose -f $compose up -d postgres redis rabbitmq

Write-Host '== Building BE solution ==' -ForegroundColor Green
dotnet build (Join-Path $PSScriptRoot '..\Caps.sln') --nologo -v q

Write-Host ''
Write-Host 'Next:' -ForegroundColor Yellow
Write-Host '  1. dotnet run --project auth/auth.csproj        (http://localhost:5194/healthz)'
Write-Host '  2. dotnet run --project gateway/gateway.csproj  (http://localhost:5190/healthz)'
Write-Host '  3. Smoke: POST http://localhost:5190/api/auth/register {"email":"a@caps.com","password":"Caps123!"}'
Write-Host 'Or full docker: docker compose -f docker/docker-compose.yml up -d --build'
