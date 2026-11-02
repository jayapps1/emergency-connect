-- Migration to update tracking policy semantics to INCIDENT_LOCATION and create response tracking tables.

UPDATE incident_category
SET tracking_policy = 'INCIDENT_LOCATION'
WHERE tracking_policy = 'SNAPSHOT_DEFAULT' OR tracking_policy = 'SNAPSHOT_ONLY' OR tracking_policy IS NULL;

UPDATE incident_location_session
SET tracking_policy = 'INCIDENT_LOCATION'
WHERE tracking_policy = 'SNAPSHOT_DEFAULT' OR tracking_policy = 'SNAPSHOT_ONLY' OR tracking_policy IS NULL;

ALTER TABLE incident_category
ALTER COLUMN tracking_policy SET DEFAULT 'INCIDENT_LOCATION';

ALTER TABLE report_assignment
ADD COLUMN IF NOT EXISTS assigned_appliance_id UUID REFERENCES response_appliance(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS response_lead_staff_user_id UUID REFERENCES admin_user(id) ON DELETE SET NULL;

CREATE TABLE response_invitation (
    id UUID PRIMARY KEY,
    report_assignment_id UUID NOT NULL REFERENCES report_assignment(id) ON DELETE CASCADE,
    response_lead_staff_user_id UUID NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
    token_hash VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL,
    created_by_staff_user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    revoked_at TIMESTAMP
);

CREATE TABLE response_tracking_session (
    id UUID PRIMARY KEY,
    report_assignment_id UUID NOT NULL REFERENCES report_assignment(id) ON DELETE CASCADE,
    assigned_appliance_id UUID REFERENCES response_appliance(id) ON DELETE SET NULL,
    response_lead_staff_user_id UUID NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
    tracking_source VARCHAR(50) NOT NULL DEFAULT 'RESPONSE_LEAD_DEVICE',
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    last_location_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE response_location_point (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES response_tracking_session(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION,
    speed_ms DOUBLE PRECISION,
    bearing_degrees DOUBLE PRECISION,
    captured_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_response_invitation_token ON response_invitation(token_hash);
CREATE INDEX idx_response_invitation_assignment ON response_invitation(report_assignment_id);
CREATE INDEX idx_response_session_assignment ON response_tracking_session(report_assignment_id);
CREATE INDEX idx_response_session_status ON response_tracking_session(status);
CREATE INDEX idx_response_point_session ON response_location_point(session_id);
CREATE INDEX idx_response_point_captured ON response_location_point(captured_at DESC);
