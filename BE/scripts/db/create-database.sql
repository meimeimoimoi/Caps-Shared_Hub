-- Creates the shared database if missing, run by an admin role connected to 'postgres'.
-- psql variables: dbname.
\set ON_ERROR_STOP on

SELECT format('CREATE DATABASE %I', :'dbname')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'dbname') \gexec
