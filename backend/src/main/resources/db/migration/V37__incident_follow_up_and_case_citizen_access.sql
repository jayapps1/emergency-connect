-- Migration to support case-linked incident follow-up workflow and controlled access retention.

CREATE TABLE incident_follow_up (
    id UUID PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES incident_report(id) ON DELETE CASCADE,
    report_assignment_id UUID REFERENCES report_assignment(id) ON DELETE CASCADE,
    citizen_user_id UUID REFERENCES public_user(id) ON DELETE SET NULL,
    installation_id UUID REFERENCES app_installation(id) ON DELETE SET NULL,
    agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
    created_by_staff_user_id UUID NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
    follow_up_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes VARCHAR(1000) NOT NULL,
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_follow_up_report ON incident_follow_up(report_id);
CREATE INDEX idx_follow_up_agency ON incident_follow_up(agency_id);
CREATE INDEX idx_follow_up_status ON incident_follow_up(status);
