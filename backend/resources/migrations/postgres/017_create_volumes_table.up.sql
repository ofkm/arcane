DROP TABLE IF EXISTS volumes_table;
DROP TABLE IF EXISTS volumes;

CREATE TABLE IF NOT EXISTS volumes (
  id                 TEXT    NOT NULL,
  name               TEXT PRIMARY KEY NOT NULL,
  driver             TEXT NOT NULL,
  mountpoint         TEXT NOT NULL,
  labels             JSONB,
  scope              TEXT NOT NULL,
  options            JSONB,
  status             JSONB,
  cluster_volume     JSONB,
  usage_data         JSONB,
  in_use             BOOLEAN NOT NULL DEFAULT false,
  docker_created_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_volumes_name ON volumes(name);