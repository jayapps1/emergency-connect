-- Migration V18: Index tracking token hashes for report claiming and create public notification table

CREATE INDEX IF NOT EXISTS idx_report_tracking_hash ON incident_report(tracking_token_hash);

CREATE TABLE IF NOT EXISTS public_notification (
    id UUID PRIMARY KEY,
    public_user_id UUID NOT NULL,
    report_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_public_user FOREIGN KEY (public_user_id) REFERENCES public_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_report FOREIGN KEY (report_id) REFERENCES incident_report(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_user ON public_notification(public_user_id);
