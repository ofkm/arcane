-- Add mobile navigation settings to the settings table
INSERT INTO settings (key, value) 
VALUES 
    ('mobileNavigationMode', 'floating'),
    ('mobileNavigationShowLabels', 'true'),
    ('mobileNavigationScrollToHide', 'true'),
    ('mobileNavigationTapToHide', 'false')
ON CONFLICT(key) DO NOTHING;
