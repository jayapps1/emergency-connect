-- Migration V17: TOTP MFA authentication, encrypted secrets, short-lived challenge tokens, and single-use recovery codes

-- TOTP secrets are stored encrypted rather than hashed because the server must recover the shared secret when validating RFC 6238 codes.
-- MFA columns extend the existing admin_user record; GEC deliberately keeps administrator identities separate from public citizen accounts.

ALTER TABLE admin_user ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admin_user ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT;
ALTER TABLE admin_user ADD COLUMN IF NOT EXISTS totp_confirmed_at TIMESTAMP;
ALTER TABLE admin_user ADD COLUMN IF NOT EXISTS mfa_recovery_generated_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS mfa_recovery_code (
    id UUID PRIMARY KEY,
    user_type VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    user_id UUID NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mfa_challenge (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    challenge_token VARCHAR(255) NOT NULL UNIQUE,
    attempts_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_user ON mfa_recovery_code(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_challenge_token ON mfa_challenge(challenge_token);
