-- Add update schedule settings to settings table
INSERT OR IGNORE INTO settings (key, value) VALUES ('updateScheduleEnabled', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('updateScheduleWindows', '{"enabled":false,"windows":[]}');
INSERT OR IGNORE INTO settings (key, value) VALUES ('updateScheduleTimezone', 'UTC');

-- Remove old auto_update_interval setting (replaced by schedules)
DELETE FROM settings WHERE key = 'autoUpdateInterval';

-- Add per-project update settings override columns to projects table
-- SQLite doesn't support modifying columns directly, so we'll work around the auto_update column
-- For new columns, we can add them directly
ALTER TABLE projects ADD COLUMN polling_enabled BOOLEAN;
ALTER TABLE projects ADD COLUMN polling_interval INTEGER;
ALTER TABLE projects ADD COLUMN update_schedule_enabled BOOLEAN;
ALTER TABLE projects ADD COLUMN update_schedule_windows TEXT;
ALTER TABLE projects ADD COLUMN update_schedule_timezone TEXT;

-- For auto_update, we need to make it nullable to support per-project overrides
-- SQLite workaround: Create a backup, recreate table, restore data
-- Note: This is a simplified version. In production with more columns/constraints,
-- you'd need to preserve all table structure, indexes, triggers, etc.

-- Step 1: Rename existing auto_update column
ALTER TABLE projects RENAME COLUMN auto_update TO auto_update_old;

-- Step 2: Add new nullable auto_update column
ALTER TABLE projects ADD COLUMN auto_update BOOLEAN;

-- Step 3: Copy data - only keep explicit 'true' values, convert 'false' to NULL (inherit from global)
UPDATE projects SET auto_update = CASE WHEN auto_update_old = 1 THEN 1 ELSE NULL END;

-- Step 4: Drop old column (SQLite 3.35.0+)
-- If your SQLite is older, this will fail silently and the old column will remain unused
ALTER TABLE projects DROP COLUMN auto_update_old;

-- Create polling_schedules table for heap-based polling scheduler
CREATE TABLE IF NOT EXISTS polling_schedules (
    id TEXT PRIMARY KEY,
    project_id TEXT UNIQUE,
    next_poll_time DATETIME NOT NULL,
    last_poll_time DATETIME,
    last_poll_duration_ms INTEGER,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create index on next_poll_time for efficient scheduling queries
CREATE INDEX IF NOT EXISTS idx_polling_schedules_next_poll_time ON polling_schedules(next_poll_time);

-- Add pollingWorkerCount setting for worker pool configuration
INSERT OR IGNORE INTO settings (key, value) VALUES ('pollingWorkerCount', '10');

