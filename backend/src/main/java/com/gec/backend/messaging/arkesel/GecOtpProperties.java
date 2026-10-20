package com.gec.backend.messaging.arkesel;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * GEC-owned OTP lifetime and length configuration properties.
 */
@ConfigurationProperties(prefix = "app.sms.otp")
public record GecOtpProperties(
    int expiryMinutes,
    int length
) {
    public GecOtpProperties {
        if (expiryMinutes <= 0) expiryMinutes = 5;
        if (length <= 0) length = 6;
    }
}
