#!/bin/sh
# Runs EF Core migration bundles sequentially against Postgres using each service's dedicated DB role.
set -eu

PG_HOST="${POSTGRES_HOST:-postgres}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_DB="${POSTGRES_DB:-caps_db}"

# Prevent MigrateInDevelopment or runtime secrets checks from interfering with EF bundle execution.
export ASPNETCORE_ENVIRONMENT="Development"
export Database__ApplyMigrations="false"
export Billing__AccountHashKey="ef-bundle-execution-placeholder"

run_bundle() {
    svc=$1
    user=$2
    password=$3
    bundle="/migrations/${svc}/efbundle"
    echo "Applying migrations for ${svc} as role ${user}..."
    "$bundle" --connection "Host=${PG_HOST};Port=${PG_PORT};Database=${PG_DB};Username=${user};Password=${password}"
}

run_bundle auth caps_auth "${CAPS_AUTH_DB_PASSWORD:?missing CAPS_AUTH_DB_PASSWORD}"
run_bundle expert caps_expert "${CAPS_EXPERT_DB_PASSWORD:?missing CAPS_EXPERT_DB_PASSWORD}"
run_bundle billing caps_billing "${CAPS_BILLING_DB_PASSWORD:?missing CAPS_BILLING_DB_PASSWORD}"
run_bundle workflow caps_workflow "${CAPS_WORKFLOW_DB_PASSWORD:?missing CAPS_WORKFLOW_DB_PASSWORD}"
run_bundle ingestion caps_ingestion "${CAPS_INGESTION_DB_PASSWORD:?missing CAPS_INGESTION_DB_PASSWORD}"
run_bundle notification caps_notification "${CAPS_NOTIFICATION_DB_PASSWORD:?missing CAPS_NOTIFICATION_DB_PASSWORD}"

echo "All database migrations applied successfully."
