# Tests

| Project | Checks | How it runs |
|---|---|---|
| `Caps.Architecture.Tests` | Layer rules (Domain/Application use no framework), services never use each other, `common` never uses a service, controllers never depend on Infrastructure, every layered service is checked, core public types have a summary | `dotnet test Caps.sln` |
| `Caps.Auth.UnitTests` | Account rules: registration, lockout, email verification, token version, refresh and verification tokens | `dotnet test Caps.sln` |
| `Caps.Workflow.UnitTests` | Review case lifecycle: frozen offer, who may act, step deadlines, information requests and the cron timeouts | `dotnet test Caps.sln` |
| `Caps.Expert.UnitTests` | Application lifecycle, file validation by content, field and birth date rules, missing requirements | `dotnet test Caps.sln` |
| `Auth.IntegrationTests` | 76 end-to-end checks through the gateway: sign-up, sessions, CSRF, lockout, emails, RS256/JWKS, session revocation, expert application | `run-auth-integration.ps1` |

## Unit and architecture tests

~~~powershell
dotnet test Caps.sln
~~~

They need nothing running. Unit tests cover Domain rules only; put a test next to the rule it protects
(`Caps.<Service>.UnitTests`, one project per service).

## Integration tests

~~~powershell
.\tests\run-auth-integration.ps1
~~~

Needs a dedicated Postgres on port 55432 (database name ending in `_test`), Redis on 6379 and SeaweedFS on
8333. The runner builds the solution, starts auth, expert and gateway on test ports (55194, 55198, 55190), runs
the checks and stops the services. Logs land in `.tmp/auth-tests/`.

CI (`.github/workflows/be-ci.yml`) runs all of the above on every backend pull request, after the formatting
check and a build with warnings as errors.
