-- Migration V16: Public user entity, app installation identity, and report relationship

CREATE TABLE IF NOT EXISTS public_user (
    id UUID PRIMARY KEY,
    phone_number_normalized VARCHAR(50) NOT NULL UNIQUE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret_encrypted VARCHAR(255),
    totp_enabled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_installation (
    id UUID PRIMARY KEY,
    installation_public_id VARCHAR(100) NOT NULL UNIQUE,
    public_user_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_installation_public_user FOREIGN KEY (public_user_id) REFERENCES public_user(id) ON DELETE SET NULL
);

ALTER TABLE incident_report ADD COLUMN IF NOT EXISTS reporter_public_user_id UUID;
ALTER TABLE incident_report ADD COLUMN IF NOT EXISTS installation_id UUID;

CREATE INDEX IF NOT EXISTS idx_public_user_phone ON public_user(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_installation_public_id ON app_installation(installation_public_id);
CREATE INDEX IF NOT EXISTS idx_report_public_user ON incident_report(reporter_public_user_id);
