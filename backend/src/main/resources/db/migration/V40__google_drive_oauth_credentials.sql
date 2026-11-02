-- Migration to support Google Drive OAuth 2.0 User Authorization and Encrypted Refresh Token Persistence

CREATE TABLE backup_cloud_credential (
    id UUID PRIMARY KEY,
    provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE_DRIVE',
    authorized_account VARCHAR(255),
    encrypted_refresh_token TEXT,
    scopes TEXT,
    target_folder_id VARCHAR(100) NOT NULL DEFAULT '1H1PXcLzevcjRs02nqOlX3CNgedE3hswY',
    status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
    connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_backup_cloud_cred_provider ON backup_cloud_credential(provider);
