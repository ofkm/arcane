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

-- Step 6: Create project_settings table
CREATE TABLE IF NOT EXISTS project_settings (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE,
    auto_update BOOLEAN,
    auto_update_cron TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);
