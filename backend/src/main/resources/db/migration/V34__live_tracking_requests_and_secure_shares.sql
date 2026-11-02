-- Migration to update tracking policy semantics and support live tracking requests and tokenized share links.

UPDATE incident_category
SET tracking_policy = 'SNAPSHOT_DEFAULT'
WHERE tracking_policy = 'SNAPSHOT_ONLY' OR tracking_policy IS NULL;

UPDATE incident_location_session
SET tracking_policy = 'SNAPSHOT_DEFAULT'
WHERE tracking_policy = 'SNAPSHOT_ONLY' OR tracking_policy IS NULL;

ALTER TABLE incident_category
ALTER COLUMN tracking_policy SET DEFAULT 'SNAPSHOT_DEFAULT';

CREATE TABLE live_tracking_request (
    id UUID PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES incident_report(id) ON DELETE CASCADE,
    requested_by_staff_id UUID NOT NULL,
    requested_by_agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
    reason VARCHAR(500),
    status VARCHAR(50) NOT NULL,
    requested_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incident_tracking_share (
    id UUID PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES incident_report(id) ON DELETE CASCADE,
    location_session_id UUID REFERENCES incident_location_session(id) ON DELETE SET NULL,
    token_hash VARCHAR(100) NOT NULL UNIQUE,
    share_mode VARCHAR(50) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    status VARCHAR(50) NOT NULL
);

CREATE INDEX idx_live_request_report ON live_tracking_request(report_id);
CREATE INDEX idx_live_request_status ON live_tracking_request(status);
CREATE INDEX idx_tracking_share_token ON incident_tracking_share(token_hash);
CREATE INDEX idx_tracking_share_report ON incident_tracking_share(report_id);
