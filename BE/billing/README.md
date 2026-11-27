# Billing service

Owns money (port **5220**, schema `billing`): payments through PayOS, prepaid credits, escrow for review cases,
settlements, expert payouts and disputes.
It does **not** own accounts (auth), review cases themselves (workflow) or expert profiles (expert).

## Status

Built: wallet and ledger reads, payout bank accounts, PayOS credit top-ups (link + webhook), the staff payout
list and escrow: hold (use case only, no endpoint until workflow sends the case fee), staff release (settlement +
PENDING expert payout), staff refund, staff review of bank accounts and staff payout transfers through PayOS payouts
(chi hộ). Disputes have tables only.

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
| GET | `/api/v1/admin/billing/bank-accounts` | `PayoutManage`, session check | optional `status` (UNVERIFIED, VERIFIED, REJECTED), paging; full account numbers |
| POST | `/api/v1/admin/billing/bank-accounts/{id}/verify` | `PayoutManage`, session check | UNVERIFIED only, not the reviewer's own account |
| POST | `/api/v1/admin/billing/bank-accounts/{id}/reject` | `PayoutManage`, session check | `reason` (1–500, shown to the expert); final |
| GET | `/api/v1/admin/billing/payouts` | `PayoutManage`, session check | optional `status`, paging as the ledger |
| POST | `/api/v1/admin/billing/payouts/{payoutId}/transfer` | `PayoutManage`, session check | PENDING or FAILED only; sends it to the expert's bank |
| POST | `/api/v1/admin/billing/payouts/{payoutId}/refresh` | `PayoutManage`, session check | reads a PROCESSING payout's outcome from PayOS |
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
- Payouts: `PENDING` → `PROCESSING` → `SUCCEEDED` or `FAILED` (staff may send a FAILED one again). The attempt is
  committed as PROCESSING before PayOS is called; its reference `<payoutId:N>-<attempt>` is also the
  `x-idempotency-key`, so repeating one attempt never pays twice and a retry is a new transfer. PayOS has no payout
  webhook: staff call `refresh`, which looks the payout up by its PayOS id, or by reference when the answer was lost.
  A reference PayOS still does not know 10 minutes later becomes FAILED (`NOT_RECEIVED`). A payout without a usable
  account (none, or the expert removed it) takes the expert's current default account when it is sent.
- Bank accounts start UNVERIFIED; staff verify one (the holder name in a banking app matches the expert's registered
  name) or reject it with a reason, once. Payouts are only sent to VERIFIED accounts: the snapshot account when it is
  still linked and verified, otherwise the expert's verified default (`PAYOUT_ACCOUNT_NOT_VERIFIED` otherwise). Full
  numbers leave the service only on the staff review endpoints.
- Account numbers are encrypted with Data Protection and hashed with HMAC. Losing the Data Protection keys makes
  stored numbers unreadable; changing `Billing:AccountHashKey` breaks duplicate detection. A duplicate means the
  same `BankBin` and the same number hash.

## Configuration

| Key | Where | Notes |
|---|---|---|
| `PayOS:ClientId`, `PayOS:ApiKey`, `PayOS:ChecksumKey` | user-secrets / environment | without them payments answer `PAYMENT_UNAVAILABLE` |
| `PayOS:ReturnUrl`, `PayOS:CancelUrl` | appsettings | FE wallet page after checkout |
| `PayOS:PayoutClientId`, `PayOS:PayoutApiKey`, `PayOS:PayoutChecksumKey` | user-secrets / environment | keys of the payout (chi hộ) channel, separate from payments; without them transfers answer `PAYMENT_UNAVAILABLE`. The channel must hold enough balance |
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
