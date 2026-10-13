# Billing service

Owns money (port **5220**, schema `billing`): payments through PayOS, prepaid credits, escrow for review cases,
settlements, expert payouts and disputes.
It does **not** own accounts (auth), review cases themselves (workflow) or expert profiles (expert).

## Status

Database model and migrations only; no API yet. The entities still have public setters and no behavior. The
first use case should turn them into entities with factories and rules (see AGENTS.md and `auth` as the model).

| Entity | Purpose |
|---|---|
| `PaymentTransaction` | a payment through PayOS, for credits or a review case |
| `CreditWallet`, `CreditLedger` | prepaid credits and their append-only movements (idempotency key per movement) |
| `Escrow`, `Settlement` | money held for a review case, then split into refund, expert payout and platform fee |
| `BankAccount`, `PayoutTransaction` | expert bank accounts (number encrypted) and transfers after settlement |
| `Dispute` | a complaint about a review case, decided by an arbiter |

## Boundaries with other services

User ids and review case ids are plain columns, not foreign keys: those rows live in auth and workflow.
Billing must learn about them through events or the access token, never by reading their schemas (its
database role cannot).

Money endpoints must be marked `[RequireSessionCheck]`: when the session revocation store is down they
answer 503 instead of trusting a possibly revoked token.

## Layout

Clean Architecture, like `auth`: `Caps.Billing.Domain` (entities), `.Application` (use cases under
`Features/`), `.Infrastructure` (`BillingDbContext` + migrations), `.Api` (controllers).

## Run (PowerShell from BE)

~~~powershell
.\scripts\setup-db-users.ps1                    # once per machine: role caps_billing + user-secrets
dotnet run --project billing/Caps.Billing.Api    # http://localhost:5220/healthz
~~~

EF commands: `dotnet ef migrations add <Name> --project billing/Caps.Billing.Infrastructure --startup-project billing/Caps.Billing.Api --output-dir Persistence/Migrations`.
