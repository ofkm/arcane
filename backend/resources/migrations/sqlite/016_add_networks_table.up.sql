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
  internal     BOOLEAN NOT NULL DEFAULT FALSE,
  attachable   BOOLEAN NOT NULL DEFAULT FALSE,
  ingress      BOOLEAN NOT NULL DEFAULT FALSE,
  options      TEXT,
  labels       TEXT,
  containers   TEXT,
  ip_am         TEXT,
  enable_ipv4  BOOLEAN NOT NULL DEFAULT FALSE,
  enable_ipv6  BOOLEAN NOT NULL DEFAULT FALSE,
  config_from  TEXT,
  config_only  BOOLEAN NOT NULL DEFAULT FALSE,
  peers        TEXT,
  services     TEXT,
  in_use       BOOLEAN NOT NULL DEFAULT FALSE,
  created      DATETIME NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_networks_name ON networks(name);