# Common building blocks

Technical code every service shares, compiled into each service (nothing here runs on its own).
It holds **no business rules and no entities**: those belong to the service that owns them.

## Packages

| Project | Contains | Used by |
|---|---|---|
| Domain | `AppException` + `ErrorType`, `UuidV7`, `FileSignature` (file type from its bytes) | Domain of every service |
| Application | `ICurrentUser`, `IUnitOfWork`, `ISessionRevocationStore`, `CommonErrors`, handler interfaces, `HealthTags` | Application of every service |
| Security | RS256 token validation (JWKS + PEM fallback), Redis session revocation, `[RequireSessionCheck]` | through Api |
| Api | `AddCommonApi` / `UseCommonApi`: controllers, Swagger, error format, `/healthz` + `/readyz`, CORS, `TimeProvider` | Api of every service |
| Persistence | `AddServiceDatabase`, `MigrateInDevelopment`, `EfUnitOfWork`, `DbInitializer` | Infrastructure of services with a database |
| Messaging | `AddCapsMessaging` (MassTransit on RabbitMQ) | services that publish or consume events |
| Contracts | Event records sent between services | publisher and consumer of each event |

Each layer of a service references only the package of the same layer, so a Domain project never sees ASP.NET
or EF Core. The architecture tests in `tests/Caps.Architecture.Tests` check this and that `common` never
references a service.

## Adding code here

Only when **both** are true: the code is technical (no business rule, no entity) **and** at least two services
need it. Code used by one service stays in that service. Changing `common` affects every service, so ask before
changing it (see AGENTS.md).

## Contracts

`Contracts` holds plain records only. Changing a record changes the message both sides exchange: add
fields as optional, never rename or remove one while a service still uses it.
