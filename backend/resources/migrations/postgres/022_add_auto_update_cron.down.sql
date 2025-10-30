-- Drop project_settings table
DROP TABLE IF EXISTS project_settings;

-- Remove auto_update_cron column
ALTER TABLE settings DROP COLUMN IF EXISTS auto_update_cron;

-- Re-add auto_update_interval column
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_update_interval TEXT DEFAULT '1440';

