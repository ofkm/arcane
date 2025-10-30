BEGIN;

-- Remove auto_update and auto_update_cron columns from projects table
ALTER TABLE projects DROP COLUMN IF EXISTS auto_update_cron;
ALTER TABLE projects DROP COLUMN IF EXISTS auto_update;

-- Remove auto_update_cron column from settings
ALTER TABLE settings DROP COLUMN IF EXISTS auto_update_cron;

-- Re-add auto_update_interval column to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_update_interval TEXT DEFAULT '1440';

COMMIT;

