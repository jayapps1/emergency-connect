-- Migration V45: Make priority_level column nullable in admin_user table

ALTER TABLE admin_user
    ALTER COLUMN priority_level DROP NOT NULL,
    ALTER COLUMN priority_level DROP DEFAULT;
