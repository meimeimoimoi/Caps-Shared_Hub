# Helper script to start Infrastructure Services (PostgreSQL + pgvector, Redis, RabbitMQ)
$dockerComposeFile = Join-Path $PSScriptRoot "..\docker\docker-compose.yml"

Write-Host "Starting Infrastructure Services (PostgreSQL, Redis, RabbitMQ)..." -ForegroundColor Green
docker compose -f $dockerComposeFile up -d

Write-Host "Checking running containers..." -ForegroundColor Yellow
docker compose -f $dockerComposeFile ps
