-- Migration V42: Extend user_management_request table for Agency-Verified 2FA Recovery Code Requests

ALTER TABLE user_management_request
    ADD COLUMN IF NOT EXISTS agency_verified_by UUID,
    ADD COLUMN IF NOT EXISTS agency_verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS agency_verification_method VARCHAR(100),
    ADD COLUMN IF NOT EXISTS agency_verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS collection_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS collection_token_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP;
