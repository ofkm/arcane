ALTER TABLE projects DROP COLUMN IF EXISTS update_schedule_enabled;
ALTER TABLE projects DROP COLUMN IF EXISTS update_schedule_windows;

UPDATE projects SET auto_update = false WHERE auto_update IS NULL;

ALTER TABLE projects ALTER COLUMN auto_update SET DEFAULT false;
ALTER TABLE projects ALTER COLUMN auto_update SET NOT NULL;

DELETE FROM settings WHERE key = 'updateScheduleEnabled';
DELETE FROM settings WHERE key = 'updateScheduleWindows';

INSERT INTO settings (key, value) VALUES ('autoUpdateInterval', '5')
ON CONFLICT (key) DO NOTHING;

