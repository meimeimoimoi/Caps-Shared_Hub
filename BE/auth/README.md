# Auth service — Microservices Architecture

Auth owns schema identity, users/roles/permissions and sessions. Clients call YARP; email delivery belongs to notification via RabbitMQ. Changes are on be/feature/auth, based on be_dev/prod.

## API contract

All mutations under /api/v1/auth require X-Caps-Client: spa. Browser Origin must be in Cors:AllowedOrigins. Requests use application/json. Access tokens use Authorization: Bearer; refresh tokens only use HttpOnly cookie caps_refresh, SameSite=Strict, path /api/v1/auth. Frontend must send credentials: include for login/register/refresh/logout and implement refresh single-flight. Use same-site gateway/frontend hosting; cross-site deployments require a reviewed cookie/CSRF policy change.

- POST /api/v1/auth/register — email, password (12–128 characters), displayName. Always USER, initially PENDING_VERIFICATION. Returns accessToken/expiresIn/user and refresh cookie. Token has no business roles until verified.
- POST /api/v1/auth/login — email/password. SHA256 demo hashes are rejected; those users must reset password.
- POST /api/v1/auth/refresh-token — cookie only; rotates once. Replaying a rotated token revokes ALL refresh sessions of that user and increments token version (conservative policy). A token revoked by logout or a password change/reset is only rejected, so a stale device cannot sign the user out of their new session.
- POST /api/v1/auth/logout — bearer plus cookie. Revokes the current refresh session and this device's access token in every service (shared Redis revocation). Refreshing with that revoked cookie returns 401.
- POST /api/v1/auth/verify-email — token. Single use; then refresh or login again.
- POST /api/v1/auth/resend-verification — limited bearer; 60-second cooldown; invalidates earlier links.
- POST /api/v1/auth/forgot-password — email. Generic response even for missing user/cooldown.
- POST /api/v1/auth/reset-password — token/password. Single use; revokes refresh sessions and increments token version.
- POST /api/v1/auth/change-password — bearer plus cookie; currentPassword/newPassword (12–128). 400 CURRENT_PASSWORD_INVALID or PASSWORD_UNCHANGED. Revokes every session, then returns a new session (accessToken + refresh cookie) for the calling device.
- GET /api/v1/users/me — bearer, including limited pending session. Returns profile/status/roles/permissions from DB.
- PUT /api/v1/users/me — active bearer; displayName/phone.
- PUT /api/v1/users/me/avatar — active bearer; multipart field file, JPEG/PNG/WebP detected from content, max 2 MB (400 AVATAR_INVALID_TYPE / AVATAR_TOO_LARGE). Returns the updated profile; avatarUrl is a gateway-relative path. DELETE /api/v1/users/me/avatar removes it.
- GET /api/v1/users/{id}/avatar — anonymous (img tags cannot send bearer); versioned URL with long-lived cache, 404 when unset. Stored in identity.user_avatar (bytea) until object storage exists.
- GET /api/v1/users/me/business-profile — active USER; data null if no profile.
- PUT /api/v1/users/me/business-profile — active USER; companyName/taxCode/address/representative/contactEmail/contactPhone. One profile per account; tax code is not globally unique across accounts.

Response: existing success/data/message envelope. Auth business failures add code: 400 validation, 401 credentials/token, 403 permission/CSRF, 409 conflict, 429 cooldown/rate limit. Rate limiter and JWT authorization may return empty bodies; frontend must handle HTTP status as well as JSON.

## Project layout

- Caps.Auth.Domain: entities with behavior (User, AuthRefreshToken, VerificationToken...), AuthErrors.
- Caps.Auth.Application: one handler per use case under Features/ (Sessions, EmailVerification, Passwords, Profile); ports under Abstractions/.
- Caps.Auth.Infrastructure: AuthDbContext + migrations, repositories, JWT/password/outbox adapters (AddAuthInfrastructure).
- Caps.Auth.Api: controllers, middleware, Program.cs. Run with `dotnet run --project auth/Caps.Auth.Api`.

EF commands: `dotnet ef migrations add <Name> --project auth/Caps.Auth.Infrastructure --startup-project auth/Caps.Auth.Api`.

## Local setup (PowerShell from BE)

Use .NET SDK 8.0.421 (global.json), PostgreSQL and RabbitMQ. The Postgres connection string is not stored in appsettings. Each service connects with its own PostgreSQL role, which owns only its schema. Create the roles and store every connection string in User Secrets once per machine (run again to rotate the passwords):

~~~powershell
.\scripts\setup-db-users.ps1                  # local PostgreSQL, asks for the admin password
~~~

The auth service connects as `caps_auth` and owns the `identity` schema.

Outside Development, supply ConnectionStrings__Postgres as an environment variable or from a secret store. Development applies migrations automatically; Production requires an explicit EF deployment step.

Configure Auth__FrontendUrl and Cors__AllowedOrigins__0. For local HTTP, Development overrides Auth__SecureCookie=false. Outside Development, SecureCookie=true, a signing key (see below) and durable Auth__DataProtectionKeysPath are required. Protect the key directory at rest and persist it across replicas/restarts. Set Auth__KnownProxies__0 to the trusted gateway IP in container deployments; never trust arbitrary forwarded headers.

Start notification alongside auth and gateway. Local notification SMTP defaults to 127.0.0.1:1025 (Mailpit), from noreply@caps.local, without TLS. For real email configure Smtp__Host, Smtp__Port, Smtp__EnableSsl=true, Smtp__From, Smtp__Username and Smtp__Password using secret configuration. Broker config: ConnectionStrings__RabbitMq.

Auth outbox stores encrypted links in the same transaction as token state. Publisher retries broker failures, skips expired messages and clears payload after publication. Delivery is at least once: duplicate emails can occur, but tokens remain single-use. RabbitMQ error queue must be monitored for SMTP failures. Auth:EmailPublisherEnabled=false is only permitted in Development for isolated tests; requests then queue email without sending.

The existing Docker compose needs overrides for real JWT, durable DataProtection storage, SMTP/notification deployment, and migrations before Production startup. Do not use its placeholder JWT key for Production.

## Migrations

AuthSecurityAndEmailOutbox adds lockout/token version, email uniqueness, role seed and encrypted outbox. AuthPermissions adds profile/business permissions, normalizes existing emails and guards uniqueness after normalization. It assigns USER only to legacy users without any role. If role codes already exist under other IDs, reconcile the role seed before migration. Duplicate emails fail migration for manual reconciliation; no users are silently deleted. Validate on a staging copy before applying to an existing team database.

## Session revocation across services

Auth publishes revocations to Redis after the database commit; every service with `ConnectionStrings:Redis` checks them while validating the token, without calling auth.

- Sign-out: the access token's `jti` is revoked until it expires (`caps:session:revoked:{jti}`).
- Password change/reset and a replayed refresh token: the new `token_version` is the lowest valid one (`caps:session:version:{userId}`, kept `Sessions:RevokeAllTtlMinutes`, default 20, which must exceed `Auth:AccessMinutes` + 2 minutes clock skew).
- A revoked token counts as no token: public endpoints still work (an old device can refresh), protected ones return 401.
- Redis down: tokens are trusted until they expire (decision 0.2), except on endpoints marked `[RequireSessionCheck]`, which return 503 `SESSION_CHECK_UNAVAILABLE`. After a failure checks are skipped for 5 seconds, so requests do not each wait for a Redis timeout. A revocation published while Redis is down is logged and lost; the auth database still enforces it for auth itself.

## Access token keys (RS256)

Only auth holds the private key; every other service verifies tokens with the public keys auth publishes at `GET /.well-known/jwks.json`.

- **Development:** nothing to configure. Without `Jwt:SigningKeys`, auth generates a key once and keeps it at `%LOCALAPPDATA%/caps-shared-hub/jwt-dev-signing-key.pem` (override with `Jwt:DevKeyPath`).
- **Other environments:** `Jwt__SigningKeys__0__PrivateKeyPath` (mounted secret file) or `Jwt__SigningKeys__0__PrivateKeyPem`. Create a key with `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt-signing-key.pem`.
- **Other services:** `Jwt:JwksUrl` points at the JWKS (downloaded on first use, refreshed every `Jwt:JwksRefreshMinutes`, last good copy kept while auth is down). `Jwt:PublicKeys` (PEM, `openssl pkey -in jwt-signing-key.pem -pubout`) is the fallback for a service that starts while auth is down. Outside Development the JWKS URL must be HTTPS unless `Jwt:RequireHttpsMetadata=false` on a trusted internal network.
- **Rotation without failed requests:** add the new key as `SigningKeys:1` (published, not signing) and wait at least `JwksRefreshMinutes`; then move it to `SigningKeys:0` and keep the old key at index 1 until its last tokens expire (`Auth:AccessMinutes`); finally remove it.

## Verification

Run from BE:

~~~powershell
dotnet build Caps.sln
dotnet build tests/Auth.IntegrationTests/Auth.IntegrationTests.csproj
./tests/run-auth-integration.ps1 -Connection 'Host=127.0.0.1;Port=55432;Database=caps_auth_test;Username=caps_auth_test'
~~~

The connection must target a dedicated DB ending _test. PostgreSQL must already be running, with permission to create that DB/extensions. Launcher starts/stops auth and gateway at 55194/55190; migrations affect only the supplied test DB. It disables external email publishing. Test runner asserts HTTP flows, DB constraints, race/replay/expiry, lockout, resend and encrypted outbox delivery via in-memory transport and fake SMTP on loopback. It is an executable assertion runner (dotnet run), not an xUnit project; failures exit nonzero. No extra testing packages were added.

## Integration limits

Auth validates token version and account status from its DB. Other services enforce ACTIVE by the shared default authorization policy and reject revoked tokens through the shared Redis revocation store (see Session revocation across services). Role and status changes still require a refresh or the token's expiry.

The FE calls the /api/v1 endpoints through the gateway (the legacy /api/auth route was removed). Access tokens are signed with RS256 (see Access token keys).
