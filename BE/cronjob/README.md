# Cron job service

Planned scheduled work (port **5102**): jobs that run on a timer rather than on a request, for example
deadline checks on review cases, scheduled crawls, or cleaning up expired data.

## Status

Empty skeleton: it starts and answers `/healthz` and `/readyz`. No jobs yet.

## When you start it

- A job should not change another service's data directly. It publishes an event or calls that service's API,
  and the owning service applies its own rules.
- Put each job in `Jobs/<Name>/` as a `BackgroundService` (or a scheduler if one is approved), with its
  schedule in configuration.
- Make jobs safe to run twice (after a restart or with two instances): check before acting, or use a lock.

## Run (PowerShell from BE)

~~~powershell
dotnet run --project cronjob   # http://localhost:5102/healthz
~~~
