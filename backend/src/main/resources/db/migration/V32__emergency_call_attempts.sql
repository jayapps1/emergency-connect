-- Records citizen-initiated emergency calls before telecom handoff so agencies
-- can follow up without assuming the external cellular call was answered.

CREATE TABLE emergency_call_attempt (
    id UUID PRIMARY KEY,
    public_reference VARCHAR(50) NOT NULL UNIQUE,
    agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
    station_id UUID REFERENCES station(id) ON DELETE SET NULL,
    station_contact_id UUID REFERENCES station_contact(id) ON DELETE SET NULL,
    public_user_id UUID REFERENCES public_user(id) ON DELETE SET NULL,
    installation_public_id VARCHAR(100),
    destination_phone VARCHAR(50) NOT NULL,
    destination_type VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_accuracy_meters DOUBLE PRECISION,
    location_captured_at TIMESTAMP,
    initiated_at TIMESTAMP NOT NULL,
    call_launched_at TIMESTAMP,
    client_generated_request_id UUID UNIQUE,
    status VARCHAR(50) NOT NULL,
    linked_report_id UUID REFERENCES incident_report(id) ON DELETE SET NULL,
    linked_report_assignment_id UUID REFERENCES report_assignment(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_call_attempt_agency ON emergency_call_attempt(agency_id);
CREATE INDEX idx_call_attempt_station ON emergency_call_attempt(station_id);
CREATE INDEX idx_call_attempt_status ON emergency_call_attempt(status);
CREATE INDEX idx_call_attempt_initiated ON emergency_call_attempt(initiated_at DESC);
CREATE INDEX idx_call_attempt_client_req ON emergency_call_attempt(client_generated_request_id);
CREATE INDEX idx_call_attempt_linked_report ON emergency_call_attempt(linked_report_id);
