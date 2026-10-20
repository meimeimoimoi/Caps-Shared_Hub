#!/bin/sh
# Runs once, when the postgres volume is first initialised. Uses the SQL files under docker/postgres/db:
# one role per service, owning only its own schemas. Passwords come from docker/.env.
set -eu

run() {
    psql -X -q -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
        -v dbname="$POSTGRES_DB" "$@"
}

# service_role <role> <password> <schema>...
service_role() {
    role=$1
    password=$2
    shift 2
    for schema in "$@"; do
        run -v role="$role" -v schema="$schema" -v password="$password" -f /caps-db/service-role.sql
    done
}

run -f /caps-db/database.sql
service_role caps_auth "$CAPS_AUTH_DB_PASSWORD" identity
service_role caps_expert "$CAPS_EXPERT_DB_PASSWORD" expert
service_role caps_billing "$CAPS_BILLING_DB_PASSWORD" billing
service_role caps_workflow "$CAPS_WORKFLOW_DB_PASSWORD" workspace review
service_role caps_ingestion "$CAPS_INGESTION_DB_PASSWORD" knowledge
service_role caps_notification "$CAPS_NOTIFICATION_DB_PASSWORD" notification
