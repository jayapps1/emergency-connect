-- Migration V43: Extend staff_notification table with action_url column if not present

ALTER TABLE staff_notification
    ADD COLUMN IF NOT EXISTS action_url VARCHAR(255);
