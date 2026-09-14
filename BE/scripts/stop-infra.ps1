# Helper script to stop Infrastructure Services
$dockerComposeFile = Join-Path $PSScriptRoot "..\docker\docker-compose.yml"

Write-Host "Stopping Infrastructure Services..." -ForegroundColor Red
docker compose -f $dockerComposeFile down
