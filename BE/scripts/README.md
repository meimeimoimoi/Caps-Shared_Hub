# Scripts

PowerShell helpers, run from `BE/`.

| Script | What it does |
|---|---|
| `setup-db-users.ps1` | Creates one Postgres role per service (owner of its schemas only) and writes each connection string to the service's user-secrets. Run once per machine; run again to rotate passwords. `-Container caps_postgres` runs psql inside the compose container. |
| `new-service.ps1 -Name <Name> -Port <port>` | Creates a layered service (`Caps.<Name>.Domain/Application/Infrastructure/Api`) from the standard skeleton and registers it in `Caps.sln`, the architecture tests and `setup-db-users.ps1`. |
| `start-all.ps1` | Starts the development infrastructure in Docker (Postgres, Redis, RabbitMQ, Mailpit, SeaweedFS) and builds the solution. |
| `start-infra.ps1` / `stop-infra.ps1` | `docker compose up -d` / `down` for **everything** in `docker/docker-compose.yml`, including the auth, expert and gateway containers. |
| `run-all-services.ps1` | Builds and starts every service locally on its standard port (`-CoreOnly`: the database services and the gateway). |
| `stop-all-services.ps1` | Stops the service processes started locally. |
| `db/*.sql` | SQL used by `setup-db-users.ps1` and by `docker/postgres/init-service-roles.sh`. |

## Standard ports

| Service | Port |
|---|---|
| gateway | 5190 |
| auth | 5194 |
| expert | 5198 |
| ingestion | 5004 |
| workflow | 5030 |
| notification | 5100 |
| cronjob | 5102 |
| rag-query | 5104 |
| read | 5106 |
| billing | 5220 |
