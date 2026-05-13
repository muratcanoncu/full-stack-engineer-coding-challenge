-- Creates the service-owned schemas before TypeORM migrations run.
-- Mirrors the schema-per-service pattern used in production: each service
-- owns one schema in a shared database, and never reads across schemas.

CREATE SCHEMA IF NOT EXISTS auth_service;
CREATE SCHEMA IF NOT EXISTS pricing_service;

GRANT ALL ON SCHEMA auth_service TO postgres;
GRANT ALL ON SCHEMA pricing_service TO postgres;
