-- Migration V24: GEC local OTP challenge storage for SMS verification

CREATE TABLE IF NOT EXISTS public_otp_challenge (
    id UUID PRIMARY KEY,
    phone_number_normalized VARCHAR(50) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'PUBLIC_REGISTRATION',
    attempt_count INT NOT NULL DEFAULT 0,
    resend_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    invalidated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON public_otp_challenge(phone_number_normalized);
