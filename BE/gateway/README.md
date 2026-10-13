# Gateway

The single entry point for the frontend (YARP reverse proxy, port **5190**). It routes requests to the services
and rejects invalid tokens early on signed-in routes. It has no database and no business logic.

## Routes

| Route | Service | Token checked at the gateway |
|---|---|---|
| `/api/v1/auth/**` | auth (5194) | no: login, register, refresh, password reset are public |
| `/api/v1/users/me/**` | auth | yes (`AuthSession`) |
| `/api/v1/users/**` | auth | no: avatars are public images |
| `/api/v1/experts/me/**` | expert (5198) | yes (`AuthSession`) |
| `/api/v1/experts/**` | expert | no |

The gateway only checks that the token is valid. Every service checks it again and decides what the user may
do, so a request that bypasses the gateway gains nothing.

## Adding a route

Add it under `ReverseProxy:Routes` (and a cluster if the service is new) in `appsettings.json`. Set
`"AuthorizationPolicy": "AuthSession"` when every endpoint under the path needs a signed-in user. In Docker the
cluster addresses come from environment variables (see `docker/docker-compose.yml`).

## Run (PowerShell from BE)

~~~powershell
dotnet run --project gateway/gateway.csproj   # http://localhost:5190/healthz
~~~

Tokens are verified with auth's public keys (`Jwt:JwksUrl`); auth does not need to be up for already
downloaded keys to work.
