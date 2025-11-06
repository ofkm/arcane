-- Add missing columns to notification_settings table for enhanced Apprise support
ALTER TABLE notification_settings ADD COLUMN apprise_urls TEXT;
ALTER TABLE notification_settings ADD COLUMN label TEXT DEFAULT '';
ALTER TABLE notification_settings ADD COLUMN tags TEXT DEFAULT '';
ALTER TABLE notification_settings ADD COLUMN validation_status TEXT DEFAULT 'pending';
ALTER TABLE notification_settings ADD COLUMN last_validated_at DATETIME;

-- Update existing records to set default values
UPDATE notification_settings
SET validation_status = 'pending', label = '', tags = '[]'
WHERE validation_status IS NULL OR tags IS NULL OR tags = '';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_validation_status ON notification_settings(validation_status);