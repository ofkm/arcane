BEGIN TRANSACTION;

ALTER TABLE projects RENAME COLUMN auto_update TO auto_update_nullable;

ALTER TABLE projects ADD COLUMN auto_update BOOLEAN NOT NULL DEFAULT false;

UPDATE projects SET auto_update = COALESCE(auto_update_nullable, false);

ALTER TABLE projects DROP COLUMN auto_update_nullable;

COMMIT;

DELETE FROM settings WHERE key = 'updateScheduleEnabled';
DELETE FROM settings WHERE key = 'updateScheduleWindows';
DELETE FROM settings WHERE key = 'updateScheduleTimezone';

INSERT OR IGNORE INTO settings (key, value) VALUES ('autoUpdateInterval', '5');
