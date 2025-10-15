-- Add update schedule settings to settings table
INSERT INTO settings (key, value) VALUES ('updateScheduleEnabled', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('updateScheduleWindows', '{"enabled":false,"windows":[]}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('updateScheduleTimezone', 'UTC')
ON CONFLICT (key) DO NOTHING;

-- Remove old auto_update_interval setting (replaced by schedules)
DELETE FROM settings WHERE key = 'autoUpdateInterval';

-- Add per-project update settings override columns to projects table
-- First, make auto_update nullable to support per-project overrides
ALTER TABLE projects ALTER COLUMN auto_update DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN auto_update DROP DEFAULT;

-- Convert existing false values to NULL (so they inherit from global settings)
-- Only keep explicit true values as overrides
UPDATE projects SET auto_update = NULL WHERE auto_update = false;

-- Add new columns for per-project overrides
ALTER TABLE projects ADD COLUMN IF NOT EXISTS polling_enabled BOOLEAN;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS polling_interval INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS update_schedule_enabled BOOLEAN;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS update_schedule_windows TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS update_schedule_timezone TEXT;

-- Create polling_schedules table for heap-based polling scheduler
CREATE TABLE IF NOT EXISTS polling_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE,
    next_poll_time TIMESTAMP NOT NULL,
    last_poll_time TIMESTAMP,
    last_poll_duration_ms INTEGER,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create index on next_poll_time for efficient scheduling queries
CREATE INDEX IF NOT EXISTS idx_polling_schedules_next_poll_time ON polling_schedules(next_poll_time);

-- Add pollingWorkerCount setting for worker pool configuration
INSERT INTO settings (key, value) VALUES ('pollingWorkerCount', '10')
ON CONFLICT (key) DO NOTHING;

