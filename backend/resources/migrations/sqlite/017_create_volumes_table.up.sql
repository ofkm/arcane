DROP TABLE IF EXISTS volumes_table;
DROP TABLE IF EXISTS volumes;

CREATE TABLE IF NOT EXISTS volumes (
  id                 TEXT    NOT NULL,
  name               TEXT PRIMARY KEY NOT NULL,
  driver             TEXT NOT NULL,
  mountpoint         TEXT NOT NULL,
  labels             TEXT,
  scope              TEXT NOT NULL,
  options            TEXT,
  status             TEXT,
  cluster_volume     TEXT,
  usage_data         TEXT,
  in_use             BOOLEAN NOT NULL DEFAULT FALSE,
  docker_created_at  TEXT,
  created_at         DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at         DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_volumes_name ON volumes(name);