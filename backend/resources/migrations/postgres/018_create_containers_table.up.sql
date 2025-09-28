DROP TABLE IF EXISTS containers_table;
DROP TABLE IF EXISTS containers;

CREATE TABLE IF NOT EXISTS containers (
  id                 TEXT PRIMARY KEY NOT NULL,
  name               TEXT NOT NULL,
  image              TEXT NOT NULL,
  image_id           TEXT,
  status             TEXT NOT NULL,
  state              TEXT NOT NULL,
  ports              JSONB,
  mounts             JSONB,
  networks           TEXT,
  labels             JSONB,
  environment        TEXT,
  command            TEXT,
  project_id         TEXT,
  docker_created_at  BIGINT,
  started_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_containers_name ON containers(name);