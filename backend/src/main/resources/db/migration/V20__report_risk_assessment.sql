-- Migration V20: Report risk assessment and abuse monitoring table

CREATE TABLE IF NOT EXISTS report_risk_assessment (
    id UUID PRIMARY KEY,
    report_id UUID NOT NULL UNIQUE,
    risk_level VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    risk_score INT,
    signals TEXT,
    review_status VARCHAR(50) NOT NULL DEFAULT 'UNREVIEWED',
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    review_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_risk_report FOREIGN KEY (report_id) REFERENCES incident_report(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_risk_level ON report_risk_assessment(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_review_status ON report_risk_assessment(review_status);
