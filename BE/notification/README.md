# Notification service

Sends emails other services ask for through RabbitMQ (port **5100**). It owns no database: every message
carries what the email needs.

## What it handles

| Event (Caps.Contracts) | Sent by | Email |
|---|---|---|
| `AuthEmailRequestedEvent` (`VERIFY_EMAIL`, `RESET_PASSWORD`) | auth, through its encrypted outbox | verification link + 6-digit code, or password reset link |

Messages whose link has already expired are dropped instead of sent. Unknown purposes throw, so MassTransit
moves the message to the error queue (no retry policy is configured yet).

## Layout

- `Features/AuthEmails/`: the consumer and the email template (HTML with tables and inline styles, because many
  mail clients ignore style tags; the logo is embedded, not linked).
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

`ConnectionStrings:RabbitMq` points at the broker.

## Run (PowerShell from BE)

~~~powershell
dotnet run --project notification   # http://localhost:5100/healthz
~~~
