-- Migration V25: RESPONDER operational role, staff notification devices, and staff notification center

-- 1. Seed RESPONDER role
INSERT INTO role (id, code, name, description, system_role)
VALUES ('88888888-8888-8888-8888-888888888888', 'RESPONDER', 'Field Responder', 'Operational field responder scoped to agency and station', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Assign read-only permissions to RESPONDER role
-- REPORT_READ (04010101), STATION_READ (02010101), STATION_CONTACT_READ (03010101), AGENCY_READ (01010101), INCIDENT_CATEGORY_READ (05010101)
INSERT INTO role_permission (role_id, permission_id) VALUES
('88888888-8888-8888-8888-888888888888', '04010101-1111-1111-1111-111111111111'), -- REPORT_READ
('88888888-8888-8888-8888-888888888888', '02010101-1111-1111-1111-111111111111'), -- STATION_READ
('88888888-8888-8888-8888-888888888888', '03010101-1111-1111-1111-111111111111'), -- STATION_CONTACT_READ
('88888888-8888-8888-8888-888888888888', '01010101-1111-1111-1111-111111111111'), -- AGENCY_READ
('88888888-8888-8888-8888-888888888888', '05010101-1111-1111-1111-111111111111')  -- INCIDENT_CATEGORY_READ
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Create staff_notification_device table
CREATE TABLE IF NOT EXISTS staff_notification_device (
    id UUID PRIMARY KEY,
    staff_user_id UUID NOT NULL,
    installation_id VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL DEFAULT 'ANDROID',
    push_token VARCHAR(255) NOT NULL,
    device_label VARCHAR(100),
    app_version VARCHAR(50),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    CONSTRAINT fk_staff_device_user FOREIGN KEY (staff_user_id) REFERENCES admin_user(id) ON DELETE CASCADE,
    CONSTRAINT uq_staff_device_installation UNIQUE (staff_user_id, installation_id)
);

-- 4. Create staff_notification table
CREATE TABLE IF NOT EXISTS staff_notification (
    id UUID PRIMARY KEY,
    staff_user_id UUID NOT NULL,
    report_id UUID,
    assignment_id UUID,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_notif_user FOREIGN KEY (staff_user_id) REFERENCES admin_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_device_user ON staff_notification_device(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_notif_user ON staff_notification(staff_user_id);
