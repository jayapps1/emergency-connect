package com.gec.backend.admin.service;

import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.entity.MfaChallengeEntity;
import com.gec.backend.admin.entity.MfaRecoveryCodeEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.repository.MfaChallengeRepository;
import com.gec.backend.admin.repository.MfaRecoveryCodeRepository;
import com.gec.backend.admin.security.TotpSecretEncryptionService;
import com.gec.backend.admin.security.TotpService;
import com.gec.backend.common.exception.ResourceConflictException;
import com.gec.backend.common.exception.ResourceNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class MfaService {

    private final AdminUserRepository userRepository;
    private final MfaChallengeRepository challengeRepository;
    private final MfaRecoveryCodeRepository recoveryCodeRepository;
    private final TotpService totpService;
    private final TotpSecretEncryptionService encryptionService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public MfaService(
        AdminUserRepository userRepository,
        MfaChallengeRepository challengeRepository,
        MfaRecoveryCodeRepository recoveryCodeRepository,
        TotpService totpService,
        TotpSecretEncryptionService encryptionService,
        AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.recoveryCodeRepository = recoveryCodeRepository;
        this.totpService = totpService;
        this.encryptionService = encryptionService;
        this.auditService = auditService;
    }

    @Transactional
    public String createMfaChallenge(UUID userId) {
        challengeRepository.deleteByUserId(userId);

        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String challengeToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        MfaChallengeEntity challenge = new MfaChallengeEntity(
            UUID.randomUUID(),
            userId,
            challengeToken,
            LocalDateTime.now().plusMinutes(5)
        );
        challengeRepository.save(challenge);

        return challengeToken;
    }

    /**
     * Authorizes TOTP setup initialization using a short-lived pre-authentication MFA challenge token.
     *
     * <p>Security Rationale:
     * First-time administrators have not yet configured two-step verification and therefore do not possess
     * a fully authenticated access JWT token. Setup initialization is authorized by an {@code mfaChallenge} token
     * issued immediately after password verification.
     *
     * @param challengeToken the short-lived pre-authentication challenge token
     * @return map containing plaintext Base32 secret and standard otpauth provisioning URI
     */
    @Transactional
    public Map<String, String> startTotpSetupWithChallenge(String challengeToken) {
        MfaChallengeEntity challenge = getValidChallenge(challengeToken);
        AdminUserEntity user = userRepository.findById(challenge.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found for challenge."));

        return startTotpSetup(user);
    }

    @Transactional
    public Map<String, String> startTotpSetup(AdminUserEntity user) {
        String secret = totpService.generateBase32Secret();
        String encryptedSecret = encryptionService.encrypt(secret);

        user.setTotpSecretEncrypted(encryptedSecret);
        userRepository.save(user);

        String provisioningUri = totpService.generateProvisioningUri(user.getEmail(), secret);

        auditService.logAction(user.getId(), "MFA_SETUP_STARTED", "ADMIN_USER", user.getId(), user.getAgencyId(), "Started TOTP MFA enrollment", null, null);

        Map<String, String> response = new HashMap<>();
        response.put("secret", secret);
        response.put("manualSetupKey", secret);
        response.put("provisioningUri", provisioningUri);
        return response;
    }

    /**
     * Confirms initial TOTP setup using a short-lived pre-authentication MFA challenge token and initial 6-digit code.
     *
     * @param challengeToken the short-lived pre-authentication challenge token
     * @param code           the 6-digit confirmation code from the user's authenticator app
     * @return list of 10 single-use plaintext recovery codes
     */
    @Transactional
    public List<String> confirmTotpSetupWithChallenge(String challengeToken, String code) {
        MfaChallengeEntity challenge = getValidChallenge(challengeToken);
        AdminUserEntity user = userRepository.findById(challenge.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found for challenge."));

        return confirmTotpSetup(user, code);
    }

    @Transactional
    public List<String> confirmTotpSetup(AdminUserEntity user, String code) {
        if (user.getTotpSecretEncrypted() == null) {
            throw new ResourceConflictException("TOTP setup has not been started for this account.");
        }

        String decryptedSecret = encryptionService.decrypt(user.getTotpSecretEncrypted());
        boolean valid = totpService.verifyCode(decryptedSecret, code);

        if (!valid) {
            throw new BadCredentialsException("Invalid 6-digit TOTP code. Verification failed.");
        }

        user.setTotpEnabled(true);
        user.setTotpConfirmedAt(LocalDateTime.now());
        userRepository.save(user);

        List<String> recoveryCodes = generateAndSaveRecoveryCodes("ADMIN", user.getId());

        auditService.logAction(user.getId(), "MFA_ENABLED", "ADMIN_USER", user.getId(), user.getAgencyId(), "TOTP MFA enabled and verified successfully", null, null);

        return recoveryCodes;
    }

    @Transactional
    public AdminUserEntity verifyMfaChallenge(String challengeToken, String code) {
        MfaChallengeEntity challenge = getValidChallenge(challengeToken);
        AdminUserEntity user = userRepository.findById(challenge.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found for challenge."));

        if (!user.isTotpEnabled() || user.getTotpSecretEncrypted() == null) {
            throw new BadCredentialsException("TOTP MFA is not enabled for this account.");
        }

        String decryptedSecret = encryptionService.decrypt(user.getTotpSecretEncrypted());
        boolean valid = totpService.verifyCode(decryptedSecret, code);

        if (!valid) {
            incrementChallengeAttempts(challenge);
            auditService.logAction(user.getId(), "MFA_FAILED", "ADMIN_USER", user.getId(), user.getAgencyId(), "Failed TOTP verification attempt", null, null);
            throw new BadCredentialsException("Invalid TOTP verification code.");
        }

        challengeRepository.delete(challenge);
        auditService.logAction(user.getId(), "MFA_VERIFIED", "ADMIN_USER", user.getId(), user.getAgencyId(), "TOTP verification succeeded", null, null);

        return user;
    }

    @Transactional
    public AdminUserEntity verifyMfaRecoveryCode(String challengeToken, String rawRecoveryCode) {
        MfaChallengeEntity challenge = getValidChallenge(challengeToken);
        AdminUserEntity user = userRepository.findById(challenge.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found for challenge."));

        String normalizedCode = rawRecoveryCode.trim().toUpperCase(Locale.US).replaceAll("[^A-Z0-9]", "");
        String codeHash = hashRecoveryCode(normalizedCode);

        Optional<MfaRecoveryCodeEntity> codeOpt = recoveryCodeRepository.findByUserIdAndCodeHashAndUsedAtIsNull(user.getId(), codeHash);

        if (codeOpt.isEmpty()) {
            incrementChallengeAttempts(challenge);
            auditService.logAction(user.getId(), "MFA_FAILED_RECOVERY_CODE", "ADMIN_USER", user.getId(), user.getAgencyId(), "Invalid recovery code used", null, null);
            throw new BadCredentialsException("Invalid or previously used recovery code.");
        }

        MfaRecoveryCodeEntity recoveryCode = codeOpt.get();
        recoveryCode.setUsedAt(LocalDateTime.now());
        recoveryCodeRepository.save(recoveryCode);

        challengeRepository.delete(challenge);
        auditService.logAction(user.getId(), "RECOVERY_CODE_USED", "ADMIN_USER", user.getId(), user.getAgencyId(), "Single-use recovery code consumed", null, null);

        return user;
    }

    private MfaChallengeEntity getValidChallenge(String challengeToken) {
        if (challengeToken == null || challengeToken.isBlank()) {
            throw new BadCredentialsException("Missing MFA challenge token.");
        }

        MfaChallengeEntity challenge = challengeRepository.findByChallengeToken(challengeToken)
            .orElseThrow(() -> new BadCredentialsException("Invalid or expired MFA challenge token. Please login again."));

        if (challenge.getExpiresAt().isBefore(LocalDateTime.now())) {
            challengeRepository.delete(challenge);
            throw new BadCredentialsException("MFA challenge token expired. Please login again.");
        }

        if (challenge.getAttemptsCount() >= 5) {
            challengeRepository.delete(challenge);
            throw new BadCredentialsException("Maximum MFA verification attempts exceeded. Please login again.");
        }

        return challenge;
    }

    private void incrementChallengeAttempts(MfaChallengeEntity challenge) {
        int attempts = challenge.getAttemptsCount() + 1;
        challenge.setAttemptsCount(attempts);
        if (attempts >= 5) {
            challengeRepository.delete(challenge);
        } else {
            challengeRepository.save(challenge);
        }
    }

    private List<String> generateAndSaveRecoveryCodes(String userType, UUID userId) {
        recoveryCodeRepository.deleteByUserId(userId);

        List<String> plaintextCodes = new ArrayList<>();
        String charPool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        for (int i = 0; i < 10; i++) {
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < 12; j++) {
                if (j > 0 && j % 4 == 0) sb.append("-");
                sb.append(charPool.charAt(secureRandom.nextInt(charPool.length())));
            }
            String code = sb.toString();
            plaintextCodes.add(code);

            String normalized = code.replaceAll("[^A-Z0-9]", "");
            String hash = hashRecoveryCode(normalized);

            MfaRecoveryCodeEntity entity = new MfaRecoveryCodeEntity(UUID.randomUUID(), userType, userId, hash);
            recoveryCodeRepository.save(entity);
        }

        return plaintextCodes;
    }

    private String hashRecoveryCode(String normalizedCode) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalizedCode.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm unavailable", e);
        }
    }
}
