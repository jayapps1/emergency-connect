-- Migration V28: SLA Escalation State Tracking for Operational Assignments

ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS acknowledgement_sla_state VARCHAR(20) DEFAULT 'ON_TIME';
ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS response_start_sla_state VARCHAR(20) DEFAULT 'ON_TIME';
ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_assignment_ack_sla ON report_assignment(acknowledgement_sla_state);
CREATE INDEX IF NOT EXISTS idx_assignment_resp_sla ON report_assignment(response_start_sla_state);
