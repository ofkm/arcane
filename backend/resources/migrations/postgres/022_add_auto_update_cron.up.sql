-- Remove auto_update_interval column
ALTER TABLE settings DROP COLUMN IF EXISTS auto_update_interval;

-- Add auto_update_cron column
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_update_cron TEXT;

-- Create project_settings table
CREATE TABLE IF NOT EXISTS project_settings (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE,
    auto_update BOOLEAN,
    auto_update_cron TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_settings_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);

