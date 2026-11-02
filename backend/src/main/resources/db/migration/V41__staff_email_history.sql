-- Migration to support permanent immutable history of staff login email changes

CREATE TABLE staff_email_history (
    id UUID PRIMARY KEY,
    staff_user_id UUID NOT NULL,
    old_email VARCHAR(255) NOT NULL,
    new_email VARCHAR(255) NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    request_id UUID,
    changed_by_user_id UUID NOT NULL,
    reason TEXT,
    requested_at TIMESTAMP,
    approved_at TIMESTAMP,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_email_history_user ON staff_email_history(staff_user_id);
