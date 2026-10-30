-- Migration V31: Individual Responder Assignment per agency report assignment

CREATE TABLE IF NOT EXISTS responder_assignment (
    id UUID PRIMARY KEY,
    report_assignment_id UUID NOT NULL,
    responder_user_id UUID NOT NULL,
    assigned_by_user_id UUID NOT NULL,
    note TEXT,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resp_assign_report_assign FOREIGN KEY (report_assignment_id) REFERENCES report_assignment(id) ON DELETE CASCADE,
    CONSTRAINT fk_resp_assign_responder_user FOREIGN KEY (responder_user_id) REFERENCES admin_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_resp_assign_assigned_by_user FOREIGN KEY (assigned_by_user_id) REFERENCES admin_user(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_responder_assignment
ON responder_assignment(report_assignment_id, responder_user_id)
WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_resp_assign_report_assign ON responder_assignment(report_assignment_id);
CREATE INDEX IF NOT EXISTS idx_resp_assign_responder_user ON responder_assignment(responder_user_id, active);
