-- Migration V14: Create incident report attachments metadata table

CREATE TABLE IF NOT EXISTS incident_report_attachment (
    id UUID PRIMARY KEY,
    report_id UUID NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255),
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachment_report FOREIGN KEY (report_id) REFERENCES incident_report(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachment_report ON incident_report_attachment(report_id);
