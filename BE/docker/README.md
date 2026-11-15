# Docker

Local infrastructure and production container orchestration for Caps-Shared Hub.

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Local development infrastructure + `auth`, `expert`, `gateway` |
| `docker-compose.prod.yml` | Full Production stack behind Caddy HTTPS reverse proxy |
| `docker-compose.gpu.yml` | Optional NVIDIA GPU passthrough override for `ollama` |
| `Dockerfile.service` | Multi-stage image for any .NET 9 microservice |
| `Dockerfile.migrator` | Builds EF Core migration bundles for the 6 database services |
| `caddy/Caddyfile` | TLS reverse proxy routing `/*` to `frontend` and `/api/*` to `gateway` |
| `.env.example` | Required environment variables; copy to `.env` (gitignored) and replace placeholders |
| `postgres/init-service-roles.sh` | Initializes all 6 service roles on a fresh Postgres volume |
| `postgres/sync-roles.sh` | Idempotently adds missing service roles to an existing Postgres volume |
| `seaweedfs/s3.json` | Development S3 credentials |
| `seaweedfs/s3.json.example` | Template for production S3 credentials (`secrets/seaweedfs-s3.json`) |
| `scripts/init-vps.sh` | Generates `secrets/jwt-signing-key.pem` and `secrets/seaweedfs-s3.json` from `.env` |
| `scripts/run-migrations.sh` | Runs the 6 EF Core migration bundles sequentially using each service role |

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

## Production deployment (VPS)

1. Copy `.env.example` to `.env` on the VPS and fill real secrets (`APP_DOMAIN`, passwords, SMTP, PayOS, internal keys).
2. Run `./scripts/init-vps.sh` to create `secrets/jwt-signing-key.pem` and `secrets/seaweedfs-s3.json`.
3. Pull images, run EF migrations, and start the stack:

~~~sh
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --wait postgres redis rabbitmq seaweedfs seaweedfs-init qdrant ollama
docker compose -f docker-compose.prod.yml run --rm migrator
docker compose -f docker-compose.prod.yml up -d --remove-orphans
~~~

On a GPU-enabled VPS, pass `-f docker-compose.gpu.yml` alongside `-f docker-compose.prod.yml`.

## Important production notes

- **No automatic migrations in Production:** Services migrate schemas only in Development (`MigrateInDevelopment`). Always run `migrator` before starting updated application containers.
- **Durable Data Protection keys:** Both `auth` (`auth_keys`) and `billing` (`billing_keys`) persist encryption keys in Docker volumes. Back up these volumes together with `secrets/jwt-signing-key.pem`, `postgres_data`, `qdrant_data`, and `seaweedfs_data`.
- **Pre-created S3 buckets:** `expert`, `ingestion`, and `workflow` forbid `Storage:CreateBucket=true` outside Development. `seaweedfs-init` creates `caps-expert-evidence`, `caps-knowledge`, and `caps-review-attachments` automatically before APIs start.
- **Real client IPs & cookies:** Caddy (`172.28.0.5`) terminates TLS on a single domain (`https://$APP_DOMAIN`), proxies `/api/*` to Gateway (`172.28.0.10`), and preserves `X-Forwarded-For` so rate limits and `SameSite=Strict; Secure` refresh cookies work properly.
- **Exec form entrypoint:** `Dockerfile.service` symlinks `<APP_NAME>.dll` to `service.dll` and uses `ENTRYPOINT ["dotnet", "service.dll"]`. Do not switch to a shell entrypoint because `/bin/sh` strips environment variables containing `-` (such as YARP's `ReverseProxy__Clusters__auth-cluster__...`).

## Adding a service role to an existing Postgres volume

Run `sync-roles.sh` inside the running Postgres container after updating `.env`:

~~~sh
docker compose -f docker-compose.prod.yml exec postgres /usr/local/bin/sync-roles.sh
~~~
