-- Remove per-project override columns
ALTER TABLE projects DROP COLUMN IF EXISTS polling_enabled;
ALTER TABLE projects DROP COLUMN IF EXISTS polling_interval;
ALTER TABLE projects DROP COLUMN IF EXISTS update_schedule_enabled;
ALTER TABLE projects DROP COLUMN IF EXISTS update_schedule_windows;
ALTER TABLE projects DROP COLUMN IF EXISTS update_schedule_timezone;

-- Restore auto_update to NOT NULL with DEFAULT
-- First, convert NULL back to false
UPDATE projects SET auto_update = false WHERE auto_update IS NULL;

-- Then restore constraints
ALTER TABLE projects ALTER COLUMN auto_update SET DEFAULT false;
ALTER TABLE projects ALTER COLUMN auto_update SET NOT NULL;

-- Remove update schedule settings
DELETE FROM settings WHERE key = 'updateScheduleEnabled';
DELETE FROM settings WHERE key = 'updateScheduleWindows';
DELETE FROM settings WHERE key = 'updateScheduleTimezone';

-- Restore old auto_update_interval setting
INSERT INTO settings (key, value) VALUES ('autoUpdateInterval', '5')
ON CONFLICT (key) DO NOTHING;

