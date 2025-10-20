INSERT INTO settings (key, value) VALUES ('updateScheduleEnabled', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('updateScheduleWindows', '[]')
ON CONFLICT (key) DO NOTHING;

DELETE FROM settings WHERE key = 'autoUpdateInterval';

ALTER TABLE projects ALTER COLUMN auto_update DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN auto_update DROP DEFAULT;

UPDATE projects SET auto_update = NULL WHERE auto_update = false;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS update_schedule_enabled BOOLEAN;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS update_schedule_windows TEXT;
