# Notification service

Sends emails other services ask for through RabbitMQ and keeps in-app notifications (port **5100**). Its
database is schema `notification` (role `caps_notification`); every message carries what the email needs.

## What it handles

| Event (Caps.Contracts) | Sent by | Email |
|---|---|---|
| `AuthEmailRequestedEvent` (`VERIFY_EMAIL`, `RESET_PASSWORD`) | auth, through its encrypted outbox | verification link + 6-digit code, or password reset link |

| `ExpertEligibilityDecidedEvent` | expert, through its outbox | Gate 1 result with the reviewer's notes, plus an in-app notification |

Messages whose link has already expired are dropped instead of sent. Unknown purposes throw, so MassTransit
moves the message to the error queue (no retry policy is configured yet).

## Layout

- `Features/AuthEmails/`: the consumer and the email template (HTML with tables and inline styles, because many
  mail clients ignore style tags; the logo is embedded, not linked).
- `Features/ExpertDecisions/`: stores the notification (one row per event id, so a redelivery does not
  duplicate it), then sends the email once (`email_sent_at`).
- `Features/Notifications/`: `GET /api/v1/notifications/me` (newest 20 + unread count),
  `POST /api/v1/notifications/me/{id}/read`, `POST /api/v1/notifications/me/read-all`; routed by the gateway
  with `AuthSession`. The FE renders the text from `type` + `data`.
- `Data/`, `Entities/`, `Migrations/`: the notification schema
  (`dotnet ef migrations add <Name> --project notification --output-dir Migrations`).
- `Email/`: `IEmailSender` and the SMTP implementation. A new channel (another provider, SMS) is a new sender,
  not a change to the consumers.

## Configuration

`Smtp` section, checked at startup (a missing `Host` or `From` stops the service):

| Key | Development |
|---|---|
| `Smtp:Host` / `Smtp:Port` | `127.0.0.1` / `1025` (Mailpit, inbox at http://localhost:8025) |
| `Smtp:EnableSsl` | `false` |
| `Smtp:From` | `noreply@caps.local` |
| `Smtp:Username` / `Smtp:Password` | empty; set them through user-secrets or the environment for a real provider |

`ConnectionStrings:RabbitMq` points at the broker. `App:WebBaseUrl` (default `http://localhost:5173`) is the web
app the emails link to. `ConnectionStrings:Postgres` is required: create the role once (docker/README.md), then
`scripts/set-connections.ps1 -Service notification`. Development applies migrations on startup.

## Run (PowerShell from BE)

~~~powershell
dotnet run --project notification   # http://localhost:5100/healthz
~~~
