-- Migration V23: Add title and is_read columns to public_notification

-- Maps the domain-level title and read status required by PublicNotificationEntity
ALTER TABLE public_notification ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT 'Report Update';
ALTER TABLE public_notification ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;
