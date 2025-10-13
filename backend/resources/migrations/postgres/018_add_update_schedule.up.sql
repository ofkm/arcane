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

