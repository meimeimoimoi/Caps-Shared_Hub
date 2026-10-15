# Docker

Local infrastructure and container images for the services.

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Postgres, Redis, RabbitMQ, Mailpit, SeaweedFS, and the auth, expert and gateway containers |
| `Dockerfile.service` | One multi-stage image for any service (`SERVICE_NAME`, or `PROJECT` + `APP_NAME` for layered services) |
| `.env.example` | Every password compose needs; copy to `.env` (gitignored) and change the values |
| `postgres/init-service-roles.sh` | Creates one database role per service on the first start of the volume (same SQL as `scripts/setup-db-users.ps1`) |
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
(environment `Production`). The gateway proxies to auth and expert by service name.

**No migrations in Production:** the services migrate their schema only in Development
(`MigrateInDevelopment`), so on a fresh Postgres volume the containers start but every endpoint that touches the
database returns 500 (auth also logs `relation "identity.auth_email_outbox" does not exist`) until migrations
are applied as a separate deployment step.

auth needs durable data protection keys outside Development (`Auth__DataProtectionKeysPath`); compose keeps them
in the `auth_keys` volume. Deleting that volume makes queued outbox emails unreadable.

The image starts the service with `dotnet service.dll` (exec form, `service.dll` links to the assembly). Do not
switch back to a shell entrypoint: `/bin/sh` drops environment variables with `-` in their names, such as
`ReverseProxy__Clusters__auth-cluster__...`, and the gateway then proxies to `localhost` (502).

The gateway has a fixed address (`172.28.0.10` on `caps_network`) and auth trusts `X-Forwarded-For` from that
address only (`Auth__KnownProxies__0`), so auth's rate limit counts real client IPs. Change both together. An
existing network keeps its old settings: run `docker compose down` once before `up`. Ports 5194 and 5198 are
published for local debugging; a real deployment publishes the gateway alone.

## Changing a role password later

The init script only runs when the Postgres volume is created. Afterwards, run `scripts/setup-db-users.ps1
-Container caps_postgres -Database caps_db` or recreate the volume.
