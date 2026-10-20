-- Migration V21: Public auth sessions, refresh token rotation, and public security activity history

CREATE TABLE IF NOT EXISTS public_auth_session (
    id UUID PRIMARY KEY,
    public_user_id UUID NOT NULL,
    app_installation_id VARCHAR(100),
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_label VARCHAR(100),
    platform VARCHAR(50) NOT NULL DEFAULT 'Android',
    app_version VARCHAR(50),
    last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revoked_reason VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_public_user FOREIGN KEY (public_user_id) REFERENCES public_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public_security_event (
    id UUID PRIMARY KEY,
    public_user_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    device_label VARCHAR(100),
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_security_event_public_user FOREIGN KEY (public_user_id) REFERENCES public_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_user ON public_auth_session(public_user_id);
CREATE INDEX IF NOT EXISTS idx_session_token_hash ON public_auth_session(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_security_event_user ON public_security_event(public_user_id);
