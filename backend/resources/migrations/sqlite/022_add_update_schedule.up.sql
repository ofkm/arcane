INSERT OR IGNORE INTO settings (key, value) VALUES ('updateScheduleEnabled', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('updateScheduleWindows', '[]');

DELETE FROM settings WHERE key = 'autoUpdateInterval';

ALTER TABLE projects ADD COLUMN update_schedule_enabled BOOLEAN;
ALTER TABLE projects ADD COLUMN update_schedule_windows TEXT;

ALTER TABLE projects RENAME COLUMN auto_update TO auto_update_old;
ALTER TABLE projects ADD COLUMN auto_update BOOLEAN;
UPDATE projects SET auto_update = CASE WHEN auto_update_old = 1 THEN 1 ELSE NULL END;
ALTER TABLE projects DROP COLUMN auto_update_old;

