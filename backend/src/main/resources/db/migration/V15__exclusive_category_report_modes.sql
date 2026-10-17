-- Migration V15: Enforce exclusive report modes for incident categories (Silent OR General, not both)

-- 1. Reconcile existing category rows to ensure supports_silent != supports_general
UPDATE incident_category SET supports_silent = TRUE, supports_general = FALSE WHERE code IN ('ROBBERY', 'SUSPICIOUS', 'RECKLESS_DRIVING');
UPDATE incident_category SET supports_silent = FALSE, supports_general = TRUE WHERE code IN ('FIRE', 'MEDICAL', 'ACCIDENT', 'HAZARD');

-- 2. Add CHECK constraint for exclusive report mode
ALTER TABLE incident_category DROP CONSTRAINT IF EXISTS chk_category_exclusive_mode;
ALTER TABLE incident_category ADD CONSTRAINT chk_category_exclusive_mode CHECK (supports_silent <> supports_general);
