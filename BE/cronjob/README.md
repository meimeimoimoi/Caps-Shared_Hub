# Cron job service

Scheduled work (port **5102**): jobs that run on a timer rather than on a request.

## Jobs

| Job | Folder | What it does |
|---|---|---|
| Monthly crawl | `Jobs/MonthlyCrawl/` | From `DayOfMonth` at `Hour` (Vietnam time) on, calls ingestion's `POST /internal/crawl-jobs/scheduled` every `CheckEvery`. Ingestion starts the month's `SCHEDULED` crawl once and answers 204 after that, so restarts, a missed day or two instances never start a second crawl. A failed run is retried, at most 3 a month. |

Configuration (`Jobs:MonthlyCrawl` in `appsettings.json`): `Enabled` (off by default, on in `docker-compose.prod.yml`),
`DayOfMonth` (1-28), `Hour` (0-23), `Sources` (`vbpl`, `mof`), `TopN` (null = crawler default), `CheckEvery`,
`IngestionUrl`, `InternalKey`. `InternalKey` is ingestion's `InternalApi:Key`; keep it out of `appsettings`:

~~~powershell
dotnet user-secrets set "Jobs:MonthlyCrawl:InternalKey" "<ingestion InternalApi:Key>" --project cronjob
dotnet user-secrets set "Jobs:MonthlyCrawl:Enabled" "true" --project cronjob
~~~

## Adding a job

- A job should not change another service's data directly. It publishes an event or calls that service's API,
  and the owning service applies its own rules.
- Put each job in `Jobs/<Name>/` as a `BackgroundService`, with its schedule in configuration.
- Make jobs safe to run twice (after a restart or with two instances): check before acting, or use a lock.

## Run (PowerShell from BE)

~~~powershell
dotnet run --project cronjob   # http://localhost:5102/healthz
~~~
