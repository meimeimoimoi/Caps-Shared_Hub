# Billing service

Owns money (port **5220**, schema `billing`): payments through PayOS, prepaid credits, escrow for review cases,
settlements, expert payouts and disputes.
It does **not** own accounts (auth), review cases themselves (workflow) or expert profiles (expert).

## Status

Built: wallet and ledger reads, payout bank accounts, PayOS credit top-ups (link + webhook), the staff payout
list and escrow: hold (use case only, no endpoint until workflow sends the case fee), staff release (settlement +
PENDING expert payout) and staff refund. Payout transfers and disputes have tables only.

| Entity | Purpose |
|---|---|
| `PaymentTransaction` | a payment through PayOS, for credits or a review case |
| `CreditWallet`, `CreditLedger` | prepaid credits and their append-only movements (idempotency key per movement) |
| `Escrow`, `Settlement` | money held for a review case, then split into refund, expert payout and platform fee |
| `BankAccount`, `PayoutTransaction` | expert bank accounts (number encrypted) and transfers after settlement |
| `Dispute` | a complaint about a review case, decided by an arbiter |

## Endpoints

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/v1/billing/wallet` | signed in | balance and held amount; no wallet yet gives zeros |
| GET | `/api/v1/billing/wallet/ledger` | signed in | `page`, `pageSize` (max 100), newest first |
| GET / POST / DELETE | `/api/v1/billing/bank-accounts` | signed in, session check on writes | at most 5; every action returns the full list |
| POST | `/api/v1/billing/payos/create-topup` | signed in, session check | 10,000–50,000,000 VND; link lives 15 minutes |
| GET | `/api/v1/billing/payos/topups/{paymentId}` | signed in, own payments only | status for polling; another user's id answers 404 |
| POST | `/api/v1/billing/payos/webhook` | anonymous, HMAC signature | called by PayOS; unknown orders are acknowledged |
| GET | `/api/v1/admin/billing/payouts` | `PayoutManage`, session check | optional `status`, paging as the ledger |
| POST | `/api/v1/admin/billing/escrows/{reviewCaseId}/release` | `PayoutManage`, session check | `expertUserId`, `platformFeePct` (0–100, fee rounded down) |
| POST | `/api/v1/admin/billing/escrows/{reviewCaseId}/refund` | `PayoutManage`, session check | held credits back to the payer's balance |

## Rules to keep when changing code

- Changes to a user's wallet or bank accounts run in a transaction and take `IBillingUserLock` first.
  `FindForUpdateAsync` / `ListForUpdateAsync` do not lock rows themselves; they are only safe after that lock.
- Lock order: a row first (`FOR UPDATE`: the payment in the webhook, the escrow in release/refund), then the
  user lock. New flows that touch both must use the same order, or they can deadlock.
- Every wallet change writes exactly one `CreditLedger` row with a unique `IdempotencyKey`
  (top-up: `payos:<orderCode>`; escrow: `escrow:<reviewCaseId>:hold|release|refund`), so a repeated notification
  can never credit twice. Hold moves credits from `Balance` to `Held`; release takes them out of `Held`
  (ledger amount 0); refund moves them back to `Balance`.
- A FAILED payment can still become SUCCEEDED from the webhook: the link may exist even though its response was lost.
- The client may skip the PayOS page: `create-topup` also returns the receiving account (`bankBin`, `accountNumber`,
  `accountName`) and `transferNote`, shown next to the `qrCode` (VietQR). They are null when PayOS omits them, so the
  client must fall back to the QR code or `checkoutUrl`. The client then polls `topups/{paymentId}`.
- PayOS is called over plain `HttpClient`; signatures are made in `PayOsSignature` (no SDK). The webhook reads the
  raw body because the signature covers the exact JSON.
- Account numbers are encrypted with Data Protection and hashed with HMAC. Losing the Data Protection keys makes
  stored numbers unreadable; changing `Billing:AccountHashKey` breaks duplicate detection. A duplicate means the
  same `BankBin` and the same number hash.

## Configuration

| Key | Where | Notes |
|---|---|---|
| `PayOS:ClientId`, `PayOS:ApiKey`, `PayOS:ChecksumKey` | user-secrets / environment | without them payments answer `PAYMENT_UNAVAILABLE` |
| `PayOS:ReturnUrl`, `PayOS:CancelUrl` | appsettings | FE wallet page after checkout |
| `Billing:AccountHashKey` | user-secrets / environment (dev value in `appsettings.Development.json`) | at least 32 characters |
| `Billing:DataProtectionKeysPath` | environment | required outside Development |

## Boundaries with other services

User ids and review case ids are plain columns, not foreign keys: those rows live in auth and workflow.
Billing must learn about them through events or the access token, never by reading their schemas (its
database role cannot).

Money endpoints must be marked `[RequireSessionCheck]`: when the session revocation store is down they
answer 503 instead of trusting a possibly revoked token.

## Layout

Clean Architecture, like `auth`: `Domain` (entities), `Application` (use cases under
`Features/`), `Infrastructure` (`BillingDbContext` + migrations), `Api` (controllers).

## Run (PowerShell from BE)

~~~powershell
dotnet run --project billing/Api    # http://localhost:5220/healthz
~~~

EF commands: `dotnet ef migrations add <Name> --project billing/Infrastructure --startup-project billing/Api --output-dir Persistence/Migrations`.

Development connection (database and service role must already exist):

```powershell
.\scripts\set-connections.ps1 -Service billing
```
