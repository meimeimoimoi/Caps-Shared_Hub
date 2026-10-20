# Backend scripts

Run from `BE/`. Infrastructure, databases, service roles and passwords must be provisioned separately.

| Script | Purpose |
|---|---|
| `run-all-services.ps1` | Builds and starts all ten backend services in the background. `-NoBuild` skips build; `-CoreOnly` starts the five database services and gateway. Logs: `.tmp/services/` at repository root. Check `/readyz` for readiness. |
| `stop-all-services.ps1` | Stops backend processes belonging to this repository; leaves infrastructure and unrelated processes running. |
| `set-connections.ps1` | Updates development connection strings in each project's user-secrets. Prompts securely for each service; does not create databases, roles or change server passwords. |

```powershell
# Enter the existing connection for each service's own PostgreSQL role.
.\scripts\set-connections.ps1 -Service auth,expert,billing,workflow,ingestion
.\scripts\set-connections.ps1 -Service auth,expert,gateway -Name Redis
.\scripts\set-connections.ps1 -Service auth,notification -Name RabbitMq
.\scripts\run-all-services.ps1
.\scripts\stop-all-services.ps1
```

Restart services after updating connections. User-secrets are for Development; use environment variables or a secret store in deployment. The connection script never prints connection values.

| Service | Port | Database schemas |
|---|---|---|
| gateway | 5190 | none |
| auth | 5194 | identity |
| expert | 5198 | expert |
| billing | 5220 | billing |
| workflow | 5030 | workspace, review |
| ingestion | 5004 | knowledge |
| notification | 5100 | none |
| cronjob | 5102 | none |
| rag-query | 5104 | none |
| read | 5106 | none |

Layered hosts use `<service>/Api/Api.csproj`; other hosts use `<service>/<service>.csproj`. Namespaces and assemblies retain `Caps.*`.

For optional Docker infrastructure, use Docker Compose directly as described in `docker/README.md`. SQL used exclusively by Docker initialization is stored in `docker/postgres/db/`.