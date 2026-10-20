-- Migration V19: Public report status notifications and push device registrations

CREATE TABLE IF NOT EXISTS public_notification (
    id UUID PRIMARY KEY,
    public_user_id UUID NOT NULL,
    report_id UUID,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_public_user FOREIGN KEY (public_user_id) REFERENCES public_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_device_registration (
    id UUID PRIMARY KEY,
    public_user_id UUID,
    app_installation_id VARCHAR(100),
    provider VARCHAR(50) NOT NULL DEFAULT 'FCM',
    device_token VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pub_notification_user ON public_notification(public_user_id);
CREATE INDEX IF NOT EXISTS idx_push_device_token ON push_device_registration(device_token);
