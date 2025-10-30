BEGIN TRANSACTION;

-- Step 1: Create new projects table without auto_update columns
CREATE TABLE projects_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dir_name TEXT,
    path TEXT NOT NULL,
    status TEXT,
    status_reason TEXT,
    service_count INTEGER DEFAULT 0,
    running_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data from old table (excluding auto_update columns)
INSERT INTO projects_new (id, name, dir_name, path, status, status_reason, service_count, running_count, created_at, updated_at)
SELECT id, name, dir_name, path, status, status_reason, service_count, running_count, created_at, updated_at
FROM projects;

-- Step 3: Drop old table
DROP TABLE projects;

-- Step 4: Rename new table
ALTER TABLE projects_new RENAME TO projects;

-- Step 5: Remove auto_update_cron setting
DELETE FROM settings WHERE key = 'autoUpdateCron';

-- Step 6: Re-add auto_update_interval setting
INSERT OR IGNORE INTO settings (key, value) VALUES ('autoUpdateInterval', '1440');

COMMIT;
