-- Drop legacy tables that could conflict
DROP TABLE IF EXISTS containers;
DROP TABLE IF EXISTS containers_table;
DROP TABLE IF EXISTS volumes;
DROP TABLE IF EXISTS volumes_table;
DROP TABLE IF EXISTS networks_table;
DROP TABLE IF EXISTS networks;

CREATE TABLE IF NOT EXISTS networks (
  id           TEXT PRIMARY KEY NOT NULL,
  name         TEXT NOT NULL UNIQUE,
  driver       TEXT NOT NULL,
  scope        TEXT NOT NULL,
  internal     BOOLEAN NOT NULL DEFAULT false,
  attachable   BOOLEAN NOT NULL DEFAULT false,
  ingress      BOOLEAN NOT NULL DEFAULT false,
  options      JSONB,
  labels       JSONB,
  containers   JSONB,
  ip_am         JSONB,
  enable_ipv4  BOOLEAN NOT NULL DEFAULT false,
  enable_ipv6  BOOLEAN NOT NULL DEFAULT false,
  config_from  JSONB,
  config_only  BOOLEAN NOT NULL DEFAULT false,
  peers        JSONB,
  services     JSONB,
  in_use       BOOLEAN NOT NULL DEFAULT false,
  created      TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_networks_name ON networks(name);