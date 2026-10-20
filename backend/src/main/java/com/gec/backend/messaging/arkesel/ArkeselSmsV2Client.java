package com.gec.backend.messaging.arkesel;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Arkesel is used only as the SMS transport. OTP generation and
 * verification remain authoritative within the GEC backend.
 *
 * <p>Provider credentials are bound once through ArkeselProperties from
 * server-side configuration. The SMS client does not maintain
 * alternate credential sources.
 */
@Component
public class ArkeselSmsV2Client {

    private static final Logger log = LoggerFactory.getLogger(ArkeselSmsV2Client.class);

    private final RestTemplate restTemplate;
    private final ArkeselProperties arkeselProperties;
    private final boolean simulationEnabled;

    /**
     * Single canonical constructor for Spring dependency injection and testing.
     *
     * @param arkeselProperties bound Arkesel configuration properties
     * @param simulationEnabled whether SMS simulation mode is explicitly enabled
     */
    @Autowired
    public ArkeselSmsV2Client(
        ArkeselProperties arkeselProperties,
        @Value("${app.sms.simulation-enabled:false}") boolean simulationEnabled
    ) {
        this.restTemplate = new RestTemplate();
        this.arkeselProperties = arkeselProperties;
        this.simulationEnabled = simulationEnabled;
    }

    @PostConstruct
    public void logStartupDiagnostics() {
        boolean osApiKeyPresent = System.getenv("ARKESEL_API_KEY") != null && !System.getenv("ARKESEL_API_KEY").isBlank();
        boolean osSenderPresent = System.getenv("ARKESEL_SENDER_ID") != null && !System.getenv("ARKESEL_SENDER_ID").isBlank();
        boolean boundApiKeyPresent = isApiKeyConfigured();
        boolean senderConfigured = arkeselProperties.senderId() != null && !arkeselProperties.senderId().isBlank();

        log.info("Arkesel configuration diagnostic: osApiKeyPresent={}, osSenderPresent={}, boundApiKeyPresent={}, senderConfigured={}, simulationEnabled={}",
                osApiKeyPresent, osSenderPresent, boundApiKeyPresent, senderConfigured, this.simulationEnabled);
    }

    public boolean isApiKeyConfigured() {
        return arkeselProperties.apiKey() != null && !arkeselProperties.apiKey().isBlank();
    }

    public boolean isSimulationEnabled() {
        return this.simulationEnabled;
    }

    public boolean sendSms(String normalizedPhoneNumber, String messageText) {
        String apiKey = arkeselProperties.apiKey();
        String senderId = arkeselProperties.senderId();

        if (apiKey.isBlank()) {
            if (this.simulationEnabled) {
                log.info("[SIMULATION MODE] SMS dispatch simulated for recipient {}: {}", maskPhone(normalizedPhoneNumber), messageText);
                return true;
            } else {
                log.error("Arkesel SMS API key is not configured and simulation mode is disabled.");
                throw new IllegalStateException("SMS verification service is temporarily unavailable. Please contact system administration.");
            }
        }

        try {
            String url = "https://sms.arkesel.com/api/v2/sms/send";
            String recipientNumber = normalizedPhoneNumber.replaceAll("^\\+", "").trim();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("sender", senderId);
            body.put("message", messageText);
            body.put("recipients", List.of(recipientNumber));

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            Map<?, ?> response = restTemplate.postForObject(url, requestEntity, Map.class);

            if (response != null) {
                Object statusObj = response.get("status");
                String statusStr = String.valueOf(statusObj);
                boolean success = "success".equalsIgnoreCase(statusStr) || "1000".equals(statusStr) || "200".equals(statusStr) || Boolean.TRUE.equals(response.get("successful"));

                if (success) {
                    log.info("Arkesel SMS request completed: phone={}, httpStatus=200, providerStatus={}", maskPhone(normalizedPhoneNumber), statusStr);
                    return true;
                } else {
                    log.warn("Arkesel SMS rejected by provider: phone={}, httpStatus=200, providerStatus={}, message={}", maskPhone(normalizedPhoneNumber), statusStr, response.get("message"));
                    return false;
                }
            }

            return false;
        } catch (HttpStatusCodeException e) {
            log.error("Arkesel SMS HTTP error: phone={}, httpStatus={}, response={}", maskPhone(normalizedPhoneNumber), e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("Failed to send Arkesel SMS to phone={}", maskPhone(normalizedPhoneNumber), e);
            return false;
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 4) + "***" + phone.substring(phone.length() - 3);
    }
}
