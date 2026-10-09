# Auth service — Microservices Architecture

Auth owns schema identity, users/roles/permissions and sessions. Clients call YARP; email delivery belongs to notification via RabbitMQ. Changes are on be/feature/auth, based on be_dev/prod.

## API contract

All mutations under /api/v1/auth require X-Caps-Client: spa. Browser Origin must be in Cors:AllowedOrigins. Requests use application/json. Access tokens use Authorization: Bearer; refresh tokens only use HttpOnly cookie caps_refresh, SameSite=Strict, path /api/v1/auth. Frontend must send credentials: include for login/register/refresh/logout and implement refresh single-flight. Use same-site gateway/frontend hosting; cross-site deployments require a reviewed cookie/CSRF policy change.

- POST /api/v1/auth/register — email, password (12–128 characters), displayName. Always USER, initially PENDING_VERIFICATION. Returns accessToken/expiresIn/user and refresh cookie. Token has no business roles until verified.
- POST /api/v1/auth/login — email/password. SHA256 demo hashes are rejected; those users must reset password.
- POST /api/v1/auth/refresh-token — cookie only; rotates once. Replay revokes ALL refresh sessions of that user and increments token version (conservative policy).
- POST /api/v1/auth/logout — bearer plus cookie. Revokes current refresh session; access expires within 15 minutes. Calling refresh with revoked token triggers conservative replay revocation.
- POST /api/v1/auth/verify-email — token. Single use; then refresh or login again.
- POST /api/v1/auth/resend-verification — limited bearer; 60-second cooldown; invalidates earlier links.
- POST /api/v1/auth/forgot-password — email. Generic response even for missing user/cooldown.
- POST /api/v1/auth/reset-password — token/password. Single use; revokes refresh sessions and increments token version.
- GET /api/v1/users/me — bearer, including limited pending session. Returns profile/status/roles/permissions from DB.
- PUT /api/v1/users/me — active bearer; displayName/phone.
- GET /api/v1/users/me/business-profile — active USER; data null if no profile.
- PUT /api/v1/users/me/business-profile — active USER; companyName/taxCode/address/representative/contactEmail/contactPhone. One profile per account; tax code is not globally unique across accounts.

Response: existing success/data/message envelope. Auth business failures add code: 400 validation, 401 credentials/token, 403 permission/CSRF, 409 conflict, 429 cooldown/rate limit. Rate limiter and JWT authorization may return empty bodies; frontend must handle HTTP status as well as JSON.

## Local setup (PowerShell from BE)

Use .NET SDK 8.0.421 (global.json), PostgreSQL and RabbitMQ. The Postgres connection string is not stored in appsettings; set it once per machine with User Secrets (stored outside the repo, loaded only in Development):

~~~powershell
dotnet user-secrets set "ConnectionStrings:Postgres" "Host=localhost;Port=5432;Database=shared_hub_db;Username=postgres;Password=<your-local-password>" --project auth
~~~

Outside Development, supply ConnectionStrings__Postgres as an environment variable or from a secret store. Development applies migrations automatically; Production requires an explicit EF deployment step.

Configure Auth__FrontendUrl, Cors__AllowedOrigins__0 and matching Jwt__Key on auth/gateway/services. For local HTTP, Development overrides Auth__SecureCookie=false. Outside Development, SecureCookie=true, a real Jwt__Key and durable Auth__DataProtectionKeysPath are required. Protect the key directory at rest and persist it across replicas/restarts. Set Auth__KnownProxies__0 to the trusted gateway IP in container deployments; never trust arbitrary forwarded headers.

Start notification alongside auth and gateway. Local notification SMTP defaults to 127.0.0.1:1025 (Mailpit), from noreply@caps.local, without TLS. For real email configure Smtp__Host, Smtp__Port, Smtp__EnableSsl=true, Smtp__From, Smtp__Username and Smtp__Password using secret configuration. Broker config: ConnectionStrings__RabbitMq.

Auth outbox stores encrypted links in the same transaction as token state. Publisher retries broker failures, skips expired messages and clears payload after publication. Delivery is at least once: duplicate emails can occur, but tokens remain single-use. RabbitMQ error queue must be monitored for SMTP failures. Auth:EmailPublisherEnabled=false is only permitted in Development for isolated tests; requests then queue email without sending.

The existing Docker compose needs overrides for real JWT, durable DataProtection storage, SMTP/notification deployment, and migrations before Production startup. Do not use its placeholder JWT key for Production.

## Migrations

AuthSecurityAndEmailOutbox adds lockout/token version, email uniqueness, role seed and encrypted outbox. AuthPermissions adds profile/business permissions, normalizes existing emails and guards uniqueness after normalization. It assigns USER only to legacy users without any role. If role codes already exist under other IDs, reconcile the role seed before migration. Duplicate emails fail migration for manual reconciliation; no users are silently deleted. Validate on a staging copy before applying to an existing team database.

## Verification

Run from BE:

~~~powershell
dotnet build Caps.sln
dotnet build tests/Auth.IntegrationTests/Auth.IntegrationTests.csproj
./tests/run-auth-integration.ps1 -Connection 'Host=127.0.0.1;Port=55432;Database=caps_auth_test;Username=caps_auth_test'
~~~

The connection must target a dedicated DB ending _test. PostgreSQL must already be running, with permission to create that DB/extensions. Launcher starts/stops auth and gateway at 55194/55190; migrations affect only the supplied test DB. It disables external email publishing. Test runner asserts HTTP flows, DB constraints, race/replay/expiry, lockout, resend and encrypted outbox delivery via in-memory transport and fake SMTP on loopback. It is an executable assertion runner (dotnet run), not an xUnit project; failures exit nonzero. No extra testing packages were added.

## Integration limits

Auth validates token version and account status from its DB. Other services enforce ACTIVE by the shared default authorization policy, but do not synchronously query Auth for token revocation; an old token can remain usable there until its 15-minute expiry. Immediate cross-service revocation requires a shared revocation mechanism. Role changes likewise require refresh or expiry.

Frontend adaptation must be made on a frontend branch: current FE still uses legacy /api/auth, stores tokens differently and lacks verification/reset pages. This backend change does not silently alter frontend. RS256/JWKS migration is a separate infrastructure decision; current signed JWT implementation remains HS256 with environment-managed key.
