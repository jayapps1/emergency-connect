-- Migration to support per-staff incident unread/read state tracking.

CREATE TABLE staff_incident_read_state (
    id UUID PRIMARY KEY,
    staff_user_id UUID NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES incident_report(id) ON DELETE CASCADE,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_staff_incident_read UNIQUE (staff_user_id, report_id)
);

CREATE INDEX idx_staff_read_user ON staff_incident_read_state(staff_user_id);
CREATE INDEX idx_staff_read_report ON staff_incident_read_state(report_id);
