-- Note: SQLite doesn't support DROP COLUMN in older versions
-- This down migration does its best to restore the previous state

-- Restore auto_update to NOT NULL DEFAULT false
BEGIN TRANSACTION;

-- Step 1: Rename current nullable column
ALTER TABLE projects RENAME COLUMN auto_update TO auto_update_nullable;

-- Step 2: Add NOT NULL column with default
ALTER TABLE projects ADD COLUMN auto_update BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Copy data back (NULL becomes false)
UPDATE projects SET auto_update = COALESCE(auto_update_nullable, false);

-- Step 4: Drop temporary column
ALTER TABLE projects DROP COLUMN auto_update_nullable;

COMMIT;

-- Note: We don't drop the other new columns as SQLite doesn't support it easily
-- In a real rollback scenario, you'd need to recreate the entire table

-- Remove update schedule settings
DELETE FROM settings WHERE key = 'updateScheduleEnabled';
DELETE FROM settings WHERE key = 'updateScheduleWindows';
DELETE FROM settings WHERE key = 'updateScheduleTimezone';

-- Restore old auto_update_interval setting
INSERT OR IGNORE INTO settings (key, value) VALUES ('autoUpdateInterval', '5');

