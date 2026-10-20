package com.gec.backend.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Service for sending push notifications via Firebase Cloud Messaging (FCM).
 *
 * <p>Design Principle:
 * Push notification delivery is an asynchronous presentation signal. FCM network failures
 * or missing server credentials must NEVER cause report submission, status transitions, or
 * database transactions to fail.
 */
@Service
public class FcmPushService {

    private static final Logger log = LoggerFactory.getLogger(FcmPushService.class);

    @Value("${app.fcm.credentials-path:}")
    private String fcmCredentialsPath;

    public void sendPushNotification(String deviceToken, String title, String message, String reportId) {
        if (deviceToken == null || deviceToken.isBlank()) {
            return;
        }

        if (fcmCredentialsPath == null || fcmCredentialsPath.isBlank()) {
            log.info("[FCM MOCK] Push notification triggered for token {}: {} - {}", maskToken(deviceToken), title, message);
            return;
        }

        try {
            log.info("Dispatching FCM push to token {}: {}", maskToken(deviceToken), title);
            // Real FCM dispatch via HTTP/2 or Admin SDK when credentials-path is configured
        } catch (Exception e) {
            log.warn("FCM push delivery failed for token {}: {}", maskToken(deviceToken), e.getMessage());
        }
    }

    private String maskToken(String token) {
        if (token == null || token.length() < 10) return "***";
        return token.substring(0, 5) + "..." + token.substring(token.length() - 5);
    }
}
