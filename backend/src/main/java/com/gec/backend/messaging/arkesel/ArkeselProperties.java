package com.gec.backend.messaging.arkesel;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Arkesel credentials are bound once from server-side environment configuration.
 * Mobile and web clients never receive provider credentials.
 */
@ConfigurationProperties(prefix = "app.sms.arkesel")
public record ArkeselProperties(
    String apiKey,
    String senderId
) {
    public ArkeselProperties {
        apiKey = apiKey == null ? "" : apiKey.trim();
        senderId = (senderId == null || senderId.isBlank()) ? "SkiliteEnt" : senderId.trim();
    }
}
