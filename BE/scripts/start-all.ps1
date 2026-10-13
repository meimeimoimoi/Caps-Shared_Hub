# Development startup: infrastructure in Docker, then a build; run the services with dotnet run
param([switch]$Build = $true)

$ErrorActionPreference = 'Stop'
$compose = Join-Path $PSScriptRoot '..\docker\docker-compose.yml'

# Mailpit receives the emails and SeaweedFS stores expert evidence files; without them those flows fail
Write-Host '== Caps Shared Hub: starting infra (postgres/redis/rabbitmq/mailpit/seaweedfs) ==' -ForegroundColor Green
docker compose -f $compose up -d postgres redis rabbitmq mailpit seaweedfs

Write-Host '== Building BE solution ==' -ForegroundColor Green
dotnet build (Join-Path $PSScriptRoot '..\Caps.sln') --nologo -v q

Write-Host ''
Write-Host 'Next:' -ForegroundColor Yellow
Write-Host '  1. dotnet run --project auth/Caps.Auth.Api       (http://localhost:5194/healthz)'
Write-Host '  2. dotnet run --project expert/Caps.Expert.Api   (http://localhost:5198/healthz)'
Write-Host '  3. dotnet run --project gateway/gateway.csproj  (http://localhost:5190/healthz)'
Write-Host '  4. Smoke: POST http://localhost:5190/api/v1/auth/register (header X-Caps-Client: spa) {"email":"a@caps.test","password":"Caps-password-123!","displayName":"Test"}'
Write-Host 'Or full docker: docker compose -f docker/docker-compose.yml up -d --build'
