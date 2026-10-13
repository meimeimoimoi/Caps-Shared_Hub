# Read service

Planned CQRS read side (port **5106**): fast, denormalized views (lists, dashboards, search pages) built from
events the other services publish, so heavy reads never query their databases directly.

## Status

Empty skeleton: it starts, answers `/healthz` and `/readyz`, and validates tokens like every service. No
database, events or endpoints yet.

## When you start it

- Build views from events (`Caps.Contracts` + a MassTransit consumer), not by reading another service's schema;
  the database roles do not allow it anyway.
- Keep one project and split by feature: `Features/<View>/` with its consumer, store and controller. Move to the
  four Clean Architecture projects only if real business rules appear.
- Give it its own schema and role in `scripts/setup-db-users.ps1`, and register the database with
  `AddServiceDatabase` (see `common/README.md`).
- Route its endpoints through `gateway/appsettings.json`.

## Run (PowerShell from BE)

~~~powershell
dotnet run --project read   # http://localhost:5106/healthz
~~~
