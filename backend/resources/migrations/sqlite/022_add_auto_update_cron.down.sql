-- Drop project_settings table
DROP TABLE IF EXISTS project_settings;

-- Remove auto_update_cron setting
DELETE FROM settings WHERE key = 'autoUpdateCron';

-- Re-add auto_update_interval setting
INSERT OR IGNORE INTO settings (key, value) VALUES ('autoUpdateInterval', '1440');
