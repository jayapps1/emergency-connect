-- Migration to support Backup & Recovery Management Module and RBAC BACKUP_OPERATOR role

-- Insert BACKUP_OPERATOR role
INSERT INTO role (id, code, name, description, system_role, created_at)
VALUES ('00000000-0000-0000-0000-000000000008', 'BACKUP_OPERATOR', 'Backup Operator', 'Authorized infrastructure operator responsible for creating, scheduling, monitoring and synchronizing system backups.', true, NOW())
ON CONFLICT (code) DO NOTHING;

-- Insert Backup Permissions
INSERT INTO permission (id, code, name, description, created_at) VALUES
('10000000-0000-0000-0000-000000000040', 'BACKUP_READ', 'Read Backup Status', 'Allows viewing backup history, schedules, and cloud sync status.', NOW()),
('10000000-0000-0000-0000-000000000041', 'BACKUP_RUN_FULL', 'Run Full Backup', 'Allows executing full database and media backup jobs.', NOW()),
('10000000-0000-0000-0000-000000000042', 'BACKUP_RUN_DIFFERENTIAL', 'Run Differential Backup', 'Allows executing differential database backup jobs.', NOW()),
('10000000-0000-0000-0000-000000000043', 'BACKUP_RUN_INCREMENTAL', 'Run Incremental Backup', 'Allows executing incremental database backup jobs.', NOW()),
('10000000-0000-0000-0000-000000000044', 'BACKUP_SCHEDULE_READ', 'Read Backup Schedules', 'Allows viewing configured automated backup schedules.', NOW()),
('10000000-0000-0000-0000-000000000045', 'BACKUP_SCHEDULE_MANAGE', 'Manage Backup Schedules', 'Allows creating, modifying, or disabling automated backup schedules.', NOW()),
('10000000-0000-0000-0000-000000000046', 'BACKUP_SYNC', 'Sync Cloud Backup', 'Allows triggering manual or automatic cloud synchronization to Google Drive.', NOW()),
('10000000-0000-0000-0000-000000000047', 'BACKUP_VERIFY', 'Verify Backup Integrity', 'Allows running SHA-256 and manifest checksum verification on backups.', NOW()),
('10000000-0000-0000-0000-000000000048', 'BACKUP_RESTORE_REQUEST', 'Request Backup Restore', 'Allows requesting system restore from an existing verified backup.', NOW()),
('10000000-0000-0000-0000-000000000049', 'BACKUP_RESTORE_EXECUTE', 'Execute Backup Restore', 'Allows approving and executing system database restore operations.', NOW()),
('10000000-0000-0000-0000-000000000050', 'BACKUP_DELETE', 'Delete Backup Archives', 'Allows deleting expired backup packages according to retention policy.', NOW())
ON CONFLICT (code) DO NOTHING;

-- Map permissions to SYSTEM_ADMIN and BACKUP_OPERATOR
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'SYSTEM_ADMIN' AND p.code LIKE 'BACKUP_%'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'BACKUP_OPERATOR' AND p.code IN ('BACKUP_READ', 'BACKUP_RUN_FULL', 'BACKUP_RUN_DIFFERENTIAL', 'BACKUP_RUN_INCREMENTAL', 'BACKUP_SCHEDULE_READ', 'BACKUP_SCHEDULE_MANAGE', 'BACKUP_SYNC', 'BACKUP_VERIFY', 'BACKUP_RESTORE_REQUEST')
ON CONFLICT DO NOTHING;

-- Create Backup Jobs Table
CREATE TABLE backup_job (
    id UUID PRIMARY KEY,
    reference VARCHAR(50) NOT NULL UNIQUE,
    backup_type VARCHAR(30) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
    local_path VARCHAR(500),
    total_bytes BIGINT DEFAULT 0,
    checksum_sha256 VARCHAR(100),
    parent_reference VARCHAR(50),
    chain_id VARCHAR(100),
    drive_file_id VARCHAR(100),
    error_message VARCHAR(1000),
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_by UUID REFERENCES admin_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Backup Schedules Table
CREATE TABLE backup_schedule (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    backup_type VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Accra',
    cloud_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_by UUID REFERENCES admin_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Backup Cloud Sync Queue Table
CREATE TABLE backup_cloud_sync_queue (
    id UUID PRIMARY KEY,
    backup_id UUID NOT NULL REFERENCES backup_job(id) ON DELETE CASCADE,
    destination_folder_id VARCHAR(100) NOT NULL DEFAULT '1H1PXcLzevcjRs02nqOlX3CNgedE3hswY',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP,
    last_attempt_at TIMESTAMP,
    last_error VARCHAR(1000),
    remote_file_id VARCHAR(100),
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Backup Restore Requests Table
CREATE TABLE backup_restore_request (
    id UUID PRIMARY KEY,
    backup_id UUID NOT NULL REFERENCES backup_job(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
    requested_by UUID NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES admin_user(id) ON DELETE SET NULL,
    notes VARCHAR(1000),
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_backup_job_type ON backup_job(backup_type);
CREATE INDEX idx_backup_job_status ON backup_job(status);
CREATE INDEX idx_backup_sync_status ON backup_cloud_sync_queue(status);
