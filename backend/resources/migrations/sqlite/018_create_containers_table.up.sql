-- Create containers table for persisted container records (includes BaseModel.id)
DROP TABLE IF EXISTS containers_table;
DROP TABLE IF EXISTS containers;

CREATE TABLE IF NOT EXISTS containers (
  id              TEXT PRIMARY KEY NOT NULL,
  name            TEXT NOT NULL,
  image           TEXT NOT NULL,
  image_id        TEXT,
  status          TEXT NOT NULL,
  state           TEXT NOT NULL,
  ports           TEXT,
  mounts          TEXT,
  networks        TEXT,
  labels          TEXT,
  environment     TEXT,
  command         TEXT,
  project_id      TEXT,
  docker_created_at INTEGER,
  started_at      DATETIME,
  created_at      DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at      DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_containers_name ON containers(name);