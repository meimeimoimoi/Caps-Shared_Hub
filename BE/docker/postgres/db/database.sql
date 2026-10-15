-- Database-wide setup, run by an admin role connected to the target database.
-- psql variables: dbname. Safe to run again.
\set ON_ERROR_STOP on

-- Extensions need elevated rights, so they are created here instead of by the services
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Only the roles granted below (and admins) may connect
REVOKE ALL ON DATABASE :"dbname" FROM PUBLIC;
