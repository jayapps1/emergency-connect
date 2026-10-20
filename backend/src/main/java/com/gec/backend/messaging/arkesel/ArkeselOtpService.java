package com.gec.backend.messaging.arkesel;

import com.gec.backend.messaging.entity.PublicOtpChallengeEntity;
import com.gec.backend.messaging.repository.PublicOtpChallengeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * GEC-managed SMS OTP verification service.
 * Generates SecureRandom 6-digit verification codes, stores SHA-256 code hashes locally with a 5-minute expiration,
 * handles resend invalidation, and dispatches SMS messages via Arkesel SMS V2.
 */
@Service
public class ArkeselOtpService {

    private static final Logger log = LoggerFactory.getLogger(ArkeselOtpService.class);

    private final PublicOtpChallengeRepository challengeRepository;
    private final ArkeselSmsV2Client smsV2Client;
    private final GecOtpProperties otpProperties;
    private final Map<String, RequestTracker> rateLimitMap = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    public ArkeselOtpService(
        PublicOtpChallengeRepository challengeRepository,
        ArkeselSmsV2Client smsV2Client,
        GecOtpProperties otpProperties
    ) {
        this.challengeRepository = challengeRepository;
        this.smsV2Client = smsV2Client;
        this.otpProperties = otpProperties;
    }

    @Transactional
    public boolean sendOtp(String normalizedPhoneNumber) {
        cleanExpiredTrackers();

        RequestTracker tracker = rateLimitMap.computeIfAbsent(normalizedPhoneNumber, k -> new RequestTracker());
        if (tracker.count >= 3 && Instant.now().isBefore(tracker.windowResetTime)) {
            throw new IllegalArgumentException("Maximum verification code request limit reached. Please try again in 10 minutes.");
        }

        if (Instant.now().isAfter(tracker.windowResetTime)) {
            tracker.count = 0;
            tracker.windowResetTime = Instant.now().plusSeconds(600); // 10 minutes
        }

        tracker.count++;

        // Resend Invalidation: invalidate previous active OTP challenges for this phone number
        List<PublicOtpChallengeEntity> activeChallenges = challengeRepository
            .findByPhoneNumberNormalizedAndInvalidatedAtIsNullAndVerifiedAtIsNull(normalizedPhoneNumber);
        for (PublicOtpChallengeEntity active : activeChallenges) {
            active.setInvalidatedAt(LocalDateTime.now());
        }
        if (!activeChallenges.isEmpty()) {
            challengeRepository.saveAll(activeChallenges);
        }

        // Generate GEC SecureRandom 6-digit numeric code
        int numericValue = secureRandom.nextInt(1_000_000);
        String code = String.format("%06d", numericValue);
        String codeHash = hashOtpCode(code);

        PublicOtpChallengeEntity challenge = new PublicOtpChallengeEntity(
            java.util.UUID.randomUUID(),
            normalizedPhoneNumber,
            codeHash,
            "PUBLIC_REGISTRATION",
            LocalDateTime.now().plusMinutes(otpProperties.expiryMinutes())
        );
        challenge.setResendCount(activeChallenges.size());
        challengeRepository.save(challenge);

        String message = "Ghana Emergency Connect verification code: " + code + ". Valid for " + otpProperties.expiryMinutes() + " minutes. Do not share this code.";

        log.info("GEC generated verification code for number {}", maskPhone(normalizedPhoneNumber));
        return smsV2Client.sendSms(normalizedPhoneNumber, message);
    }

    @Transactional
    public boolean verifyOtp(String normalizedPhoneNumber, String code) {
        if (code == null || code.isBlank()) {
            return false;
        }

        String sanitizedCode = code.replaceAll("[^0-9]", "").trim();

        // Simulation mode when explicitly enabled
        if (smsV2Client.isSimulationEnabled() && "123456".equals(sanitizedCode)) {
            log.info("Simulated test code 123456 accepted for {}", maskPhone(normalizedPhoneNumber));
            return true;
        }

        Optional<PublicOtpChallengeEntity> challengeOpt = challengeRepository
            .findTopByPhoneNumberNormalizedAndInvalidatedAtIsNullAndVerifiedAtIsNullOrderByCreatedAtDesc(normalizedPhoneNumber);

        if (challengeOpt.isEmpty()) {
            throw new IllegalArgumentException("No active verification request found. Please request a new code.");
        }

        PublicOtpChallengeEntity challenge = challengeOpt.get();

        if (challenge.getExpiresAt().isBefore(LocalDateTime.now())) {
            challenge.setInvalidatedAt(LocalDateTime.now());
            challengeRepository.save(challenge);
            throw new IllegalArgumentException("Verification code has expired. Please request a new code.");
        }

        String submittedHash = hashOtpCode(sanitizedCode);
        if (submittedHash.equals(challenge.getCodeHash())) {
            challenge.setVerifiedAt(LocalDateTime.now());
            challengeRepository.save(challenge);
            log.info("GEC OTP verified successfully for number {}", maskPhone(normalizedPhoneNumber));
            return true;
        } else {
            int attempts = challenge.getAttemptCount() + 1;
            challenge.setAttemptCount(attempts);
            if (attempts >= 5) {
                challenge.setInvalidatedAt(LocalDateTime.now());
            }
            challengeRepository.save(challenge);

            if (attempts >= 5) {
                throw new IllegalArgumentException("Maximum verification attempts exceeded. Please request a new code.");
            }
            throw new IllegalArgumentException("Invalid verification code. Please check and try again.");
        }
    }

    private String hashOtpCode(String rawCode) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawCode.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm unavailable", e);
        }
    }

    private void cleanExpiredTrackers() {
        Instant now = Instant.now();
        rateLimitMap.entrySet().removeIf(e -> now.isAfter(e.getValue().windowResetTime));
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 4) + "***" + phone.substring(phone.length() - 3);
    }

    private static class RequestTracker {
        int count = 0;
        Instant windowResetTime = Instant.now().plusSeconds(600);
    }
}
