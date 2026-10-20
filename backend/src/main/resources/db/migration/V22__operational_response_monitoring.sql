-- Migration V22: Response monitoring timestamps on report assignments

ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;
ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS acknowledged_by UUID;
ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS action_started_at TIMESTAMP;
ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS action_started_by UUID;
ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS resolved_by UUID;
ALTER TABLE report_assignment ADD COLUMN IF NOT EXISTS resolution_note TEXT;
