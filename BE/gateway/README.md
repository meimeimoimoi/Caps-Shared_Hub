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

## Rate limits

Every route has a per-IP limit (`RateLimiterPolicy` on the route): `auth` for `/api/v1/auth/**` (30 per minute)
and `api` for the rest (300 per minute). Change the numbers in `RateLimits`. Over the limit the gateway answers
429 `RATE_LIMITED` with a `Retry-After` header. The gateway is the first hop, so the connection address is the
client IP; if a load balancer is ever put in front of it, configure forwarded headers here first, otherwise
every client shares the load balancer's limit. Auth keeps its own per-IP limit for requests that do not come
through the gateway.

## Security headers

Every response gets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and `Referrer-Policy:
no-referrer`, and no `Server` header. Responses under `/api` also get `Content-Security-Policy: default-src
'none'; frame-ancestors 'none'` and `Cache-Control: no-store` unless the service set its own cache policy (e.g.
versioned avatars). These protect API responses only: the React app's CSP belongs wherever `index.html` is
served. HSTS is not sent because the gateway speaks plain HTTP; enable it where TLS is terminated.

## Adding a route

Add it under `ReverseProxy:Routes` (and a cluster if the service is new) in `appsettings.json` with a
`RateLimiterPolicy` (`auth` or `api`). Set `"AuthorizationPolicy": "AuthSession"` when every endpoint under the
path needs a signed-in user. In Docker the cluster addresses come from environment variables (see
`docker/docker-compose.yml`).

## Run (PowerShell from BE)

~~~powershell
dotnet run --project gateway/gateway.csproj   # http://localhost:5190/healthz
~~~

Tokens are verified with auth's public keys (`Jwt:JwksUrl`); auth does not need to be up for already
downloaded keys to work.
