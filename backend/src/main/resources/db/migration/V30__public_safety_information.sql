-- Migration V30: Public Safety Information and Advisories

CREATE TABLE IF NOT EXISTS safety_information (
    id UUID PRIMARY KEY,
    source_type VARCHAR(20) NOT NULL,
    agency_id UUID REFERENCES agency(id),
    created_by UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    notify_users BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    removed_at TIMESTAMP,
    removed_by UUID,
    removal_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_safety_pub ON safety_information(status, published_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_safety_agency ON safety_information(agency_id);
