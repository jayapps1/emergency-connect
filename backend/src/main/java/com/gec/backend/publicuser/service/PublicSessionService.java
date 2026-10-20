package com.gec.backend.publicuser.service;

import com.gec.backend.admin.security.JwtTokenProvider;
import com.gec.backend.admin.security.TotpSecretEncryptionService;
import com.gec.backend.admin.security.TotpService;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.common.exception.ResourceConflictException;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.common.util.PhoneNumberNormalizer;
import com.gec.backend.messaging.arkesel.ArkeselOtpService;
import com.gec.backend.publicuser.entity.PublicAuthSessionEntity;
import com.gec.backend.publicuser.entity.PublicSecurityEventEntity;
import com.gec.backend.publicuser.entity.PublicUserEntity;
import com.gec.backend.publicuser.repository.PublicAuthSessionRepository;
import com.gec.backend.publicuser.repository.PublicSecurityEventRepository;
import com.gec.backend.publicuser.repository.PublicUserRepository;
import com.gec.backend.publicuser.security.PublicUserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PublicSessionService {

    private final PublicAuthSessionRepository sessionRepository;
    private final PublicSecurityEventRepository securityEventRepository;
    private final PublicUserRepository publicUserRepository;
    private final ArkeselOtpService otpService;
    private final JwtTokenProvider tokenProvider;
    private final TotpService totpService;
    private final TotpSecretEncryptionService encryptionService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public PublicSessionService(
        PublicAuthSessionRepository sessionRepository,
        PublicSecurityEventRepository securityEventRepository,
        PublicUserRepository publicUserRepository,
        ArkeselOtpService otpService,
        JwtTokenProvider tokenProvider,
        TotpService totpService,
        TotpSecretEncryptionService encryptionService,
        AuditService auditService
    ) {
        this.sessionRepository = sessionRepository;
        this.securityEventRepository = securityEventRepository;
        this.publicUserRepository = publicUserRepository;
        this.otpService = otpService;
        this.tokenProvider = tokenProvider;
        this.totpService = totpService;
        this.encryptionService = encryptionService;
        this.auditService = auditService;
    }

    @Transactional
    public String createSession(UUID publicUserId, String installationPublicId, String deviceLabel) {
        String rawToken = generateRawToken();
        String tokenHash = hashToken(rawToken);

        PublicAuthSessionEntity session = new PublicAuthSessionEntity(
            UUID.randomUUID(),
            publicUserId,
            installationPublicId,
            tokenHash,
            deviceLabel != null ? deviceLabel : "Android Device",
            LocalDateTime.now().plusDays(30)
        );
        sessionRepository.save(session);

        logSecurityEvent(publicUserId, "LOGIN_SUCCESS", deviceLabel, "New public auth session created");
        return rawToken;
    }

    @Transactional
    public Map<String, String> startPublicTotpSetup() {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) throw new ResourceNotFoundException("Authentication required.");

        PublicUserEntity user = publicUserRepository.findById(principal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Public user not found."));

        String secret = totpService.generateBase32Secret();
        String encryptedSecret = encryptionService.encrypt(secret);

        user.setTotpSecretEncrypted(encryptedSecret);
        publicUserRepository.save(user);

        String provisioningUri = totpService.generateProvisioningUri(user.getPhoneNumberNormalized(), secret);
        logSecurityEvent(user.getId(), "TOTP_SETUP_STARTED", null, "Started public TOTP MFA enrollment");

        Map<String, String> response = new HashMap<>();
        response.put("secret", secret);
        response.put("manualSetupKey", secret);
        response.put("provisioningUri", provisioningUri);
        return response;
    }

    @Transactional
    public Map<String, String> confirmPublicTotpSetup(String code) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) throw new ResourceNotFoundException("Authentication required.");

        PublicUserEntity user = publicUserRepository.findById(principal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Public user not found."));

        if (user.getTotpSecretEncrypted() == null) {
            throw new ResourceConflictException("TOTP setup has not been started for this account.");
        }

        String decryptedSecret = encryptionService.decrypt(user.getTotpSecretEncrypted());
        boolean valid = totpService.verifyCode(decryptedSecret, code);

        if (!valid) {
            throw new BadCredentialsException("Invalid 6-digit TOTP code. Verification failed.");
        }

        user.setTotpEnabled(true);
        user.setTotpEnabledAt(LocalDateTime.now());
        publicUserRepository.save(user);

        logSecurityEvent(user.getId(), "TOTP_ENABLED", null, "Public TOTP MFA enabled successfully");
        return Map.of("message", "Authenticator App enabled successfully.");
    }

    @Transactional
    public Map<String, String> disablePublicTotp() {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) throw new ResourceNotFoundException("Authentication required.");

        PublicUserEntity user = publicUserRepository.findById(principal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Public user not found."));

        user.setTotpEnabled(false);
        user.setTotpSecretEncrypted(null);
        user.setTotpEnabledAt(null);
        publicUserRepository.save(user);

        logSecurityEvent(user.getId(), "TOTP_DISABLED", null, "Public TOTP MFA disabled by user");
        return Map.of("message", "Authenticator App disabled successfully.");
    }

    @Transactional
    public Map<String, Object> rotateRefreshToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new BadCredentialsException("Missing refresh token.");
        }

        String hash = hashToken(rawRefreshToken);
        Optional<PublicAuthSessionEntity> sessionOpt = sessionRepository.findByRefreshTokenHash(hash);

        if (sessionOpt.isEmpty()) {
            throw new BadCredentialsException("Invalid refresh token.");
        }

        PublicAuthSessionEntity session = sessionOpt.get();

        if (session.getRevokedAt() != null) {
            logSecurityEvent(session.getPublicUserId(), "REFRESH_TOKEN_REUSE_DETECTED", session.getDeviceLabel(), "Reuse attempt of previously revoked refresh token");
            revokeAllUserSessions(session.getPublicUserId(), "TOKEN_REUSE_DETECTED");
            throw new BadCredentialsException("Revoked session. Please sign in again.");
        }

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setRevokedAt(LocalDateTime.now());
            session.setRevokedReason("EXPIRED");
            sessionRepository.save(session);
            throw new BadCredentialsException("Session expired. Please sign in again.");
        }

        PublicUserEntity user = publicUserRepository.findById(session.getPublicUserId())
            .orElseThrow(() -> new ResourceNotFoundException("Public user not found."));

        session.setRevokedAt(LocalDateTime.now());
        session.setRevokedReason("ROTATED");
        sessionRepository.save(session);

        String newRawToken = createSession(user.getId(), session.getAppInstallationId(), session.getDeviceLabel());
        String newAccessToken = tokenProvider.generatePublicUserToken(user);

        return Map.of(
            "accessToken", newAccessToken,
            "refreshToken", newRawToken,
            "expiresInSeconds", tokenProvider.getExpirationInSeconds() * 2880
        );
    }

    public List<PublicAuthSessionEntity> getActiveSessions() {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) throw new ResourceNotFoundException("Authentication required.");
        return sessionRepository.findByPublicUserIdAndRevokedAtIsNullOrderByLastUsedAtDesc(principal.getId());
    }

    @Transactional
    public void revokeSession(UUID sessionId) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return;

        PublicAuthSessionEntity session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (!session.getPublicUserId().equals(principal.getId())) {
            throw new ResourceNotFoundException("Session not found: " + sessionId);
        }

        session.setRevokedAt(LocalDateTime.now());
        session.setRevokedReason("USER_REVOKED");
        sessionRepository.save(session);

        logSecurityEvent(principal.getId(), "SESSION_REVOKED", session.getDeviceLabel(), "Session revoked by user");
    }

    @Transactional
    public void revokeAllUserSessions(UUID publicUserId, String reason) {
        List<PublicAuthSessionEntity> activeSessions = sessionRepository.findByPublicUserIdAndRevokedAtIsNull(publicUserId);
        for (PublicAuthSessionEntity session : activeSessions) {
            session.setRevokedAt(LocalDateTime.now());
            session.setRevokedReason(reason != null ? reason : "LOGOUT_ALL");
        }
        sessionRepository.saveAll(activeSessions);
        logSecurityEvent(publicUserId, "ALL_SESSIONS_REVOKED", null, "All active sessions revoked (" + reason + ")");
    }

    @Transactional
    public Map<String, String> requestPhoneChangeOtp(String newPhone) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) throw new ResourceNotFoundException("Authentication required.");

        String normalized = PhoneNumberNormalizer.normalize(newPhone);
        if (normalized == null || normalized.length() < 10) {
            throw new IllegalArgumentException("Please enter a valid telephone number.");
        }

        if (publicUserRepository.existsByPhoneNumberNormalized(normalized)) {
            throw new ResourceConflictException("That telephone number is already registered to another account.");
        }

        otpService.sendOtp(normalized);
        logSecurityEvent(principal.getId(), "PHONE_CHANGE_STARTED", null, "Verification code sent to new phone number");

        return Map.of("message", "Verification code sent to new phone number.", "phoneNumber", normalized);
    }

    @Transactional
    public void verifyAndChangePhoneNumber(String newPhone, String code) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) throw new ResourceNotFoundException("Authentication required.");

        String normalized = PhoneNumberNormalizer.normalize(newPhone);
        if (normalized == null || normalized.length() < 10) {
            throw new IllegalArgumentException("Please enter a valid telephone number.");
        }

        boolean verified = otpService.verifyOtp(normalized, code);
        if (!verified) {
            throw new IllegalArgumentException("Invalid or expired verification code.");
        }

        PublicUserEntity user = publicUserRepository.findById(principal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setPhoneNumberNormalized(normalized);
        user.setPhoneVerified(true);
        user.setUpdatedAt(LocalDateTime.now());
        publicUserRepository.save(user);

        logSecurityEvent(principal.getId(), "PHONE_CHANGED", null, "Verified phone number updated successfully");
    }

    public Page<PublicSecurityEventEntity> getSecurityActivity(Pageable pageable) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) throw new ResourceNotFoundException("Authentication required.");
        return securityEventRepository.findByPublicUserIdOrderByCreatedAtDesc(principal.getId(), pageable);
    }

    private void logSecurityEvent(UUID publicUserId, String eventType, String deviceLabel, String message) {
        PublicSecurityEventEntity event = new PublicSecurityEventEntity(
            UUID.randomUUID(),
            publicUserId,
            eventType,
            deviceLabel,
            message
        );
        securityEventRepository.save(event);
    }

    private PublicUserPrincipal getCurrentPrincipal() {
        Object principal = SecurityContextHolder.getContext().getAuthentication() != null
            ? SecurityContextHolder.getContext().getAuthentication().getPrincipal()
            : null;
        if (principal instanceof PublicUserPrincipal p) {
            return p;
        }
        return null;
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }
}
