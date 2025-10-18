INSERT INTO settings (key, value) VALUES ('updateScheduleEnabled', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('updateScheduleWindows', '{"enabled":false,"windows":[]}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('updateScheduleTimezone', 'UTC')
ON CONFLICT (key) DO NOTHING;

DELETE FROM settings WHERE key = 'autoUpdateInterval';

ALTER TABLE projects ALTER COLUMN auto_update DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN auto_update DROP DEFAULT;

UPDATE projects SET auto_update = NULL WHERE auto_update = false;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS update_schedule_enabled BOOLEAN;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS update_schedule_windows TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS update_schedule_timezone TEXT;
