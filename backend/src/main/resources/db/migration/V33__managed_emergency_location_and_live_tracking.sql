-- Managed emergency location and consent-based live tracking sessions.

ALTER TABLE incident_category
ADD COLUMN IF NOT EXISTS tracking_policy VARCHAR(50) DEFAULT 'SNAPSHOT_ONLY';

CREATE TABLE incident_location_session (
    id UUID PRIMARY KEY,
    report_id UUID REFERENCES incident_report(id) ON DELETE CASCADE,
    call_attempt_id UUID REFERENCES emergency_call_attempt(id) ON DELETE CASCADE,
    public_user_id UUID REFERENCES public_user(id) ON DELETE SET NULL,
    installation_public_id VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    tracking_policy VARCHAR(50) NOT NULL,
    consent_granted_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP NOT NULL,
    last_location_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incident_location_point (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES incident_location_session(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION,
    captured_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_location_session_report ON incident_location_session(report_id);
CREATE INDEX idx_location_session_call ON incident_location_session(call_attempt_id);
CREATE INDEX idx_location_session_status ON incident_location_session(status);
CREATE INDEX idx_location_point_session ON incident_location_point(session_id);
CREATE INDEX idx_location_point_captured ON incident_location_point(captured_at DESC);
