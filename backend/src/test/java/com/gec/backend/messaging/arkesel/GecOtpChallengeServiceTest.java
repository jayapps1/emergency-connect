package com.gec.backend.messaging.arkesel;

import com.gec.backend.messaging.entity.PublicOtpChallengeEntity;
import com.gec.backend.messaging.repository.PublicOtpChallengeRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

class GecOtpChallengeServiceTest {

    private final PublicOtpChallengeRepository challengeRepository = Mockito.mock(PublicOtpChallengeRepository.class);
    private final ArkeselSmsV2Client smsV2Client = Mockito.mock(ArkeselSmsV2Client.class);
    private final GecOtpProperties otpProperties = new GecOtpProperties(5, 6);

    private final ArkeselOtpService otpService = new ArkeselOtpService(challengeRepository, smsV2Client, otpProperties);

    @Test
    void sendOtp_generatesChallengeAndCallsSmsClient() {
        given(challengeRepository.findByPhoneNumberNormalizedAndInvalidatedAtIsNullAndVerifiedAtIsNull("+233541553337"))
            .willReturn(List.of());
        given(smsV2Client.sendSms(any(), any())).willReturn(true);

        boolean result = otpService.sendOtp("+233541553337");
        assertTrue(result);
    }

    @Test
    void verifyOtp_validCode_succeeds() throws Exception {
        String phone = "+233541553337";
        String rawCode = "483920";

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(rawCode.getBytes(StandardCharsets.UTF_8));
        String codeHash = Base64.getEncoder().encodeToString(hash);

        PublicOtpChallengeEntity challenge = new PublicOtpChallengeEntity(
            UUID.randomUUID(),
            phone,
            codeHash,
            "PUBLIC_REGISTRATION",
            LocalDateTime.now().plusMinutes(5)
        );

        given(challengeRepository.findTopByPhoneNumberNormalizedAndInvalidatedAtIsNullAndVerifiedAtIsNullOrderByCreatedAtDesc(phone))
            .willReturn(Optional.of(challenge));

        boolean verified = otpService.verifyOtp(phone, rawCode);
        assertTrue(verified);
        assertNotNull(challenge.getVerifiedAt());
    }

    @Test
    void verifyOtp_expiredChallenge_throwsException() throws Exception {
        String phone = "+233541553337";
        String rawCode = "483920";

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(rawCode.getBytes(StandardCharsets.UTF_8));
        String codeHash = Base64.getEncoder().encodeToString(hash);

        PublicOtpChallengeEntity expiredChallenge = new PublicOtpChallengeEntity(
            UUID.randomUUID(),
            phone,
            codeHash,
            "PUBLIC_REGISTRATION",
            LocalDateTime.now().minusMinutes(1) // Expired
        );

        given(challengeRepository.findTopByPhoneNumberNormalizedAndInvalidatedAtIsNullAndVerifiedAtIsNullOrderByCreatedAtDesc(phone))
            .willReturn(Optional.of(expiredChallenge));

        assertThrows(IllegalArgumentException.class, () -> {
            otpService.verifyOtp(phone, rawCode);
        });
    }
}
