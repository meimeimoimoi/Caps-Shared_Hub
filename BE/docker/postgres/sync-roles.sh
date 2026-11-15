#!/bin/sh
# Idempotently ensures the database extensions and all six service roles exist on an existing Postgres volume.
# Run inside the running postgres container or via docker compose exec postgres.
set -eu

run() {
    psql -X -q -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-caps_db}" \
        -v dbname="${POSTGRES_DB:-caps_db}" "$@"
}

service_role() {
    role=$1
    password=$2
    shift 2
    for schema in "$@"; do
        run -v role="$role" -v schema="$schema" -v password="$password" -f /caps-db/service-role.sql
    done
}

run -f /caps-db/database.sql
service_role caps_auth "${CAPS_AUTH_DB_PASSWORD:?missing CAPS_AUTH_DB_PASSWORD}" identity
service_role caps_expert "${CAPS_EXPERT_DB_PASSWORD:?missing CAPS_EXPERT_DB_PASSWORD}" expert
service_role caps_billing "${CAPS_BILLING_DB_PASSWORD:?missing CAPS_BILLING_DB_PASSWORD}" billing
service_role caps_workflow "${CAPS_WORKFLOW_DB_PASSWORD:?missing CAPS_WORKFLOW_DB_PASSWORD}" workspace review
service_role caps_ingestion "${CAPS_INGESTION_DB_PASSWORD:?missing CAPS_INGESTION_DB_PASSWORD}" knowledge
service_role caps_notification "${CAPS_NOTIFICATION_DB_PASSWORD:?missing CAPS_NOTIFICATION_DB_PASSWORD}" notification
