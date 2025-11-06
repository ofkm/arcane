-- Add missing columns to notification_settings table for enhanced Apprise support
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS apprise_urls JSONB;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS label VARCHAR(255) DEFAULT '';
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP;

-- Update existing records to set default values
UPDATE notification_settings 
SET validation_status = 'pending', label = '', tags = '[]'::jsonb
WHERE validation_status IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_validation_status ON notification_settings(validation_status);