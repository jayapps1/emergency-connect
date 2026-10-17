-- Migration V13: Update silent incident category flags, names, and display orders

ALTER TABLE incident_category ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Update categories eligible for Silent Report mode
UPDATE incident_category
SET name = 'Theft / Robbery / Assault',
    description = 'Theft, robbery, assault, or immediate personal threat',
    supports_silent = TRUE,
    display_order = 1
WHERE code = 'ROBBERY';

UPDATE incident_category
SET name = 'Suspicious Activity',
    description = 'Suspicious persons, behaviour, packages or potential threats',
    supports_silent = TRUE,
    display_order = 2
WHERE code = 'SUSPICIOUS';

UPDATE incident_category
SET name = 'Reckless / Dangerous Driving',
    description = 'Dangerous driving, speeding, hit-and-run or road threat',
    supports_silent = TRUE,
    display_order = 3
WHERE code = 'RECKLESS_DRIVING';

-- Update categories NOT eligible for Silent Report mode
UPDATE incident_category SET supports_silent = FALSE, display_order = 10 WHERE code = 'FIRE';
UPDATE incident_category SET supports_silent = FALSE, display_order = 11 WHERE code = 'MEDICAL';
UPDATE incident_category SET supports_silent = FALSE, display_order = 12 WHERE code = 'ACCIDENT';
UPDATE incident_category SET supports_silent = FALSE, display_order = 13 WHERE code = 'HAZARD';
