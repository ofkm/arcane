-- Remove enhanced columns from notification_settings table
DROP INDEX IF EXISTS idx_notification_settings_validation_status;

ALTER TABLE notification_settings DROP COLUMN last_validated_at;
ALTER TABLE notification_settings DROP COLUMN validation_status;
ALTER TABLE notification_settings DROP COLUMN tags;
ALTER TABLE notification_settings DROP COLUMN label;
ALTER TABLE notification_settings DROP COLUMN apprise_urls;