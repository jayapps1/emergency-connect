-- Migration V44: Add priority_level column to admin_user table

ALTER TABLE admin_user
    ADD COLUMN IF NOT EXISTS priority_level INTEGER NOT NULL DEFAULT 2;
