-- Migration V12: Add phone normalization, contact priority uniqueness per station, and normalized phone uniqueness

-- 1. Add normalized_phone_number column if not exists
ALTER TABLE station_contact ADD COLUMN IF NOT EXISTS normalized_phone_number VARCHAR(100);

-- 2. Populate normalized_phone_number for existing records
UPDATE station_contact
SET normalized_phone_number = CASE
    WHEN phone_number LIKE '0%' THEN '+233' || SUBSTRING(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g'), 2)
    WHEN phone_number LIKE '233%' THEN '+' || REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')
    WHEN phone_number LIKE '+%' THEN '+' || REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')
    ELSE REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')
END
WHERE normalized_phone_number IS NULL OR normalized_phone_number = '';

-- 3. Reconcile duplicate contact priorities deterministically PER STATION (keep earliest, renumber duplicates)
WITH renumbered AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY station_id
            ORDER BY priority ASC, created_at ASC, id ASC
        ) AS new_priority
    FROM station_contact
)
UPDATE station_contact sc
SET priority = r.new_priority,
    updated_at = CURRENT_TIMESTAMP
FROM renumbered r
WHERE sc.id = r.id AND sc.priority <> r.new_priority;

-- 4. Reconcile duplicate normalized phone numbers deterministically (keep earliest, suffix duplicates)
WITH phone_ranks AS (
    SELECT
        id,
        normalized_phone_number,
        ROW_NUMBER() OVER (
            PARTITION BY normalized_phone_number
            ORDER BY created_at ASC, id ASC
        ) AS phone_rank
    FROM station_contact
    WHERE normalized_phone_number IS NOT NULL AND normalized_phone_number <> ''
)
UPDATE station_contact sc
SET normalized_phone_number = sc.normalized_phone_number || '-dup-' || pr.phone_rank,
    updated_at = CURRENT_TIMESTAMP
FROM phone_ranks pr
WHERE sc.id = pr.id AND pr.phone_rank > 1;

-- 5. Add unique constraint on station_id and priority
ALTER TABLE station_contact DROP CONSTRAINT IF EXISTS uq_station_contact_priority;
ALTER TABLE station_contact ADD CONSTRAINT uq_station_contact_priority UNIQUE (station_id, priority);

-- 6. Add unique constraint on normalized_phone_number
ALTER TABLE station_contact DROP CONSTRAINT IF EXISTS uq_station_contact_normalized_phone;
ALTER TABLE station_contact ADD CONSTRAINT uq_station_contact_normalized_phone UNIQUE (normalized_phone_number);
