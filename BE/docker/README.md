# Docker

Local infrastructure and container images for the services.

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Postgres, Redis, RabbitMQ, Mailpit, SeaweedFS, and the auth, expert and gateway containers |
| `Dockerfile.service` | One multi-stage image for any service (`SERVICE_NAME`, or `PROJECT` + `APP_NAME` for layered services) |
| `.env.example` | Every password compose needs; copy to `.env` (gitignored) and change the values |
| `postgres/init-service-roles.sh` | Initializes service roles on a new Docker volume using `postgres/db/*.sql` |
| `seaweedfs/s3.json` | Development S3 keys for the evidence bucket |
| `secrets/jwt-signing-key.pem` | auth's private signing key (gitignored); create it as `.env.example` explains |

## Infrastructure only (usual development setup)

~~~powershell
Copy-Item docker\.env.example docker\.env      # first time; change the passwords
docker compose -f docker/docker-compose.yml up -d postgres redis rabbitmq mailpit seaweedfs
~~~

| Service | Address |
|---|---|
| Postgres | `localhost:5432` (admin `postgres`, password from `.env`; each service has its own role) |
| Redis | `localhost:6379` |
| RabbitMQ | `localhost:5672`, management UI http://localhost:15672 (`guest` / `guest`) |
| Mailpit | SMTP `localhost:1025`, inbox http://localhost:8025 |
| SeaweedFS | S3 API http://localhost:8333 |

## Whole stack in containers

`docker compose -f docker/docker-compose.yml up -d --build` also builds and runs auth, expert and gateway
(environment `Production`). Not verified end to end yet: in Production the services do not migrate their
database on startup, so a fresh volume has no tables until migrations are applied as a deployment step.

## Changing a role password later

Change the role password through a PostgreSQL administrator, then update docker/.env for containers and run scripts/set-connections.ps1 for local hosts. The connection script does not change server passwords.
