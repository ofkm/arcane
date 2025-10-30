BEGIN TRANSACTION;

-- Step 1: Create new settings table without auto_update_interval
CREATE TABLE settings_new (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Step 2: Copy data from old table (excluding auto_update_interval if it exists)
INSERT INTO settings_new (key, value)
SELECT key, value FROM settings
WHERE key != 'autoUpdateInterval';

-- Step 3: Drop old table
DROP TABLE settings;

-- Step 4: Rename new table
ALTER TABLE settings_new RENAME TO settings;

-- Step 5: Add auto_update_cron setting if it doesn't exist
INSERT OR IGNORE INTO settings (key, value) VALUES ('autoUpdateCron', '');

-- Step 6: Add auto_update and auto_update_cron columns to projects table
ALTER TABLE projects ADD COLUMN auto_update BOOLEAN;
ALTER TABLE projects ADD COLUMN auto_update_cron TEXT;

COMMIT;
