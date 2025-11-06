-- Remove enhanced columns from notification_settings table
DROP INDEX IF EXISTS idx_notification_settings_validation_status;

ALTER TABLE notification_settings DROP COLUMN IF EXISTS last_validated_at;
ALTER TABLE notification_settings DROP COLUMN IF EXISTS validation_status;
ALTER TABLE notification_settings DROP COLUMN IF EXISTS tags;
ALTER TABLE notification_settings DROP COLUMN IF EXISTS label;
ALTER TABLE notification_settings DROP COLUMN IF EXISTS apprise_urls;