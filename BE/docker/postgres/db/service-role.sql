-- One service role owning one schema, run by an admin role connected to the target database.
-- psql variables: dbname, role, schema, password. Safe to run again; a rerun sets the new password.
\set ON_ERROR_STOP on

SELECT format('CREATE ROLE %I', :'role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role') \gexec

ALTER ROLE :"role" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'password';
GRANT CONNECT, TEMPORARY ON DATABASE :"dbname" TO :"role";

-- The role owns its schema, so its migrations can change it; it has no rights on other schemas
CREATE SCHEMA IF NOT EXISTS :"schema" AUTHORIZATION :"role";
ALTER SCHEMA :"schema" OWNER TO :"role";

-- Tables created earlier by an admin connection move to the service role (their sequences follow)
SELECT format('ALTER TABLE %I.%I OWNER TO %I', schemaname, tablename, :'role')
FROM pg_tables
WHERE schemaname = :'schema' AND tableowner <> :'role' \gexec
