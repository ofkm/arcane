-- Restore mobileNavigationScrollToHide setting with default value
INSERT INTO settings (key, value) VALUES ('mobileNavigationScrollToHide', 'true')
ON CONFLICT(key) DO NOTHING;

