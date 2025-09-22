-- Remove mobile navigation settings from the settings table
DELETE FROM settings WHERE key IN (
    'mobileNavigationMode',
    'mobileNavigationShowLabels',
    'mobileNavigationScrollToHide', 
    'mobileNavigationTapToHide'
);
