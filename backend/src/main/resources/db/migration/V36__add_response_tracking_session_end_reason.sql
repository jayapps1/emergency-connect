-- Migration to add missing end_reason column to response_tracking_session table.

ALTER TABLE response_tracking_session
ADD COLUMN IF NOT EXISTS end_reason VARCHAR(100);
