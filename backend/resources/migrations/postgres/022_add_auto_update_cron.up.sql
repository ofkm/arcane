-- Remove auto_update_interval column from settings
ALTER TABLE settings DROP COLUMN IF EXISTS auto_update_interval;

-- Add auto_update_cron column to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_update_cron TEXT;

-- Add auto_update and auto_update_cron columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_update BOOLEAN;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_update_cron TEXT;

