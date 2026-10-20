package com.gec.backend.publicuser.service;

import com.gec.backend.admin.security.JwtTokenProvider;
import com.gec.backend.admin.security.TotpSecretEncryptionService;
import com.gec.backend.admin.security.TotpService;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.common.util.PhoneNumberNormalizer;
import com.gec.backend.messaging.arkesel.ArkeselOtpService;
import com.gec.backend.publicuser.entity.AppInstallationEntity;
import com.gec.backend.publicuser.entity.PublicUserEntity;
import com.gec.backend.publicuser.repository.AppInstallationRepository;
import com.gec.backend.publicuser.repository.PublicUserRepository;
import com.gec.backend.publicuser.security.PublicUserPrincipal;
import com.gec.backend.report.dto.TrackedReportResponse;
import com.gec.backend.report.entity.IncidentReportEntity;
import com.gec.backend.report.repository.IncidentReportRepository;
import com.gec.backend.report.service.IncidentReportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Public authentication service handling citizen registration, SMS OTP dispatch,
 * optional TOTP MFA enrollment, and session token generation.
 *
 * <p>Security & Privacy Principles:
 * <ul>
 *   <li><b>Server-Side MFA Check:</b> Accounts with active TOTP receive a TOTP challenge during login start;
 *       SMS OTP is not dispatched automatically when TOTP MFA is enabled.</li>
 *   <li><b>Local OTP Verification:</b> Arkesel is used strictly as an SMS delivery transport.
 *       Verification code hashes are generated and validated locally within GEC.</li>
 *   <li><b>Session Persistence:</b> Refresh tokens survive application restarts via token rotation.</li>
 * </ul>
 */
@Service
public class PublicAuthService {

    private static final Logger log = LoggerFactory.getLogger(PublicAuthService.class);

    private final PublicUserRepository publicUserRepository;
    private final AppInstallationRepository installationRepository;
    private final IncidentReportRepository reportRepository;
    private final IncidentReportService reportService;
    private final ArkeselOtpService otpService;
    private final JwtTokenProvider tokenProvider;
    private final TotpService totpService;
    private final TotpSecretEncryptionService encryptionService;
    private final AuditService auditService;

    public PublicAuthService(
        PublicUserRepository publicUserRepository,
        AppInstallationRepository installationRepository,
        IncidentReportRepository reportRepository,
        IncidentReportService reportService,
        ArkeselOtpService otpService,
        JwtTokenProvider tokenProvider,
        TotpService totpService,
        TotpSecretEncryptionService encryptionService,
        AuditService auditService
    ) {
        this.publicUserRepository = publicUserRepository;
        this.installationRepository = installationRepository;
        this.reportRepository = reportRepository;
        this.reportService = reportService;
        this.otpService = otpService;
        this.tokenProvider = tokenProvider;
        this.totpService = totpService;
        this.encryptionService = encryptionService;
        this.auditService = auditService;
    }

    /**
     * Handles initial authentication/registration request for a given phone number.
     * If the public account exists and has enabled TOTP MFA, returns nextStep = TOTP_REQUIRED without sending SMS automatically.
     */
    public Map<String, String> requestOtp(String rawPhone) {
        String normalized = PhoneNumberNormalizer.normalize(rawPhone);
        if (normalized == null || normalized.length() < 10) {
            throw new IllegalArgumentException("Please enter a valid telephone number.");
        }

        Optional<PublicUserEntity> userOpt = publicUserRepository.findByPhoneNumberNormalized(normalized);
        boolean isTotp = userOpt.isPresent() && userOpt.get().isTotpEnabled();

        log.info("PUBLIC LOGIN START: normalized={}, userFound={}, totpEnabled={}",
                maskPhone(normalized), userOpt.isPresent(), isTotp);

        if (isTotp) {
            return Map.of(
                "nextStep", "TOTP_REQUIRED",
                "message", "Authenticator 2-Step Verification required.",
                "phoneNumber", normalized
            );
        }

        boolean sent = otpService.sendOtp(normalized);
        if (!sent) {
            throw new RuntimeException("Unable to send verification code right now. Please try again shortly.");
        }

        return Map.of(
            "nextStep", "SMS_OTP_REQUIRED",
            "message", "Verification code sent successfully.",
            "phoneNumber", normalized
        );
    }

    /**
     * Explicit fallback method for TOTP-enabled accounts requesting SMS delivery.
     */
    public Map<String, String> requestSmsFallbackOtp(String rawPhone) {
        String normalized = PhoneNumberNormalizer.normalize(rawPhone);
        if (normalized == null || normalized.length() < 10) {
            throw new IllegalArgumentException("Please enter a valid telephone number.");
        }

        boolean sent = otpService.sendOtp(normalized);
        if (!sent) {
            throw new RuntimeException("Unable to send verification code right now. Please try again shortly.");
        }

        return Map.of(
            "nextStep", "SMS_OTP_REQUIRED",
            "message", "Verification code sent via SMS fallback.",
            "phoneNumber", normalized
        );
    }

    @Transactional
    public Map<String, Object> verifyOtpAndAuthenticate(String rawPhone, String code, String installationPublicId) {
        String normalized = PhoneNumberNormalizer.normalize(rawPhone);
        if (normalized == null || normalized.length() < 10) {
            throw new IllegalArgumentException("Please enter a valid telephone number.");
        }

        boolean verified = otpService.verifyOtp(normalized, code);
        if (!verified) {
            throw new IllegalArgumentException("Invalid or expired verification code. Please check and try again.");
        }

        PublicUserEntity user = publicUserRepository.findByPhoneNumberNormalized(normalized)
            .orElseGet(() -> {
                PublicUserEntity newUser = new PublicUserEntity(UUID.randomUUID(), normalized, true);
                return publicUserRepository.save(newUser);
            });

        user.setPhoneVerified(true);
        user.setLastLoginAt(LocalDateTime.now());
        publicUserRepository.save(user);

        if (installationPublicId != null && !installationPublicId.isBlank()) {
            linkInstallationToUser(installationPublicId.trim(), user.getId());
        }

        String accessToken = tokenProvider.generatePublicUserToken(user);

        Map<String, Object> response = new HashMap<>();
        response.put("accessToken", accessToken);
        response.put("expiresInSeconds", tokenProvider.getExpirationInSeconds() * 2880);
        response.put("userId", user.getId().toString());
        response.put("phoneNumber", user.getPhoneNumberNormalized());
        response.put("phoneVerified", user.isPhoneVerified());

        return response;
    }

    @Transactional
    public Map<String, Object> verifyPublicTotpLogin(String rawPhone, String code, String installationPublicId) {
        String normalized = PhoneNumberNormalizer.normalize(rawPhone);
        if (normalized == null || normalized.length() < 10) {
            throw new IllegalArgumentException("Please enter a valid telephone number.");
        }

        PublicUserEntity user = publicUserRepository.findByPhoneNumberNormalized(normalized)
            .orElseThrow(() -> new ResourceNotFoundException("Public user account not found."));

        if (!user.isTotpEnabled() || user.getTotpSecretEncrypted() == null) {
            throw new IllegalArgumentException("Authenticator 2-Step Verification is not enabled for this account.");
        }

        String decryptedSecret = encryptionService.decrypt(user.getTotpSecretEncrypted());
        boolean valid = totpService.verifyCode(decryptedSecret, code);

        if (!valid) {
            throw new IllegalArgumentException("Invalid 6-digit TOTP code. Verification failed.");
        }

        user.setLastLoginAt(LocalDateTime.now());
        publicUserRepository.save(user);

        if (installationPublicId != null && !installationPublicId.isBlank()) {
            linkInstallationToUser(installationPublicId.trim(), user.getId());
        }

        String accessToken = tokenProvider.generatePublicUserToken(user);

        Map<String, Object> response = new HashMap<>();
        response.put("accessToken", accessToken);
        response.put("expiresInSeconds", tokenProvider.getExpirationInSeconds() * 2880);
        response.put("userId", user.getId().toString());
        response.put("phoneNumber", user.getPhoneNumberNormalized());
        response.put("phoneVerified", user.isPhoneVerified());

        return response;
    }

    /**
     * Links an anonymously submitted incident report to the authenticated public user
     * only after the caller proves possession of the report's tracking credential.
     */
    @Transactional
    public TrackedReportResponse claimReport(String reference, String trackingToken) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) {
            throw new IllegalArgumentException("Authentication is required to claim a report.");
        }

        if (reference == null || reference.isBlank() || trackingToken == null || trackingToken.isBlank()) {
            throw new IllegalArgumentException("Unable to add this report. Check the reference and tracking code.");
        }

        String trimmedRef = reference.trim();
        String trimmedToken = trackingToken.trim();

        IncidentReportEntity report = reportRepository.findByPublicReference(trimmedRef)
            .orElseThrow(() -> new IllegalArgumentException("Unable to add this report. Check the reference and tracking code."));

        String tokenHash = hashToken(trimmedToken);
        if (report.getTrackingTokenHash() == null || !report.getTrackingTokenHash().equals(tokenHash)) {
            throw new IllegalArgumentException("Unable to add this report. Check the reference and tracking code.");
        }

        if (report.getReporterPublicUserId() != null && !report.getReporterPublicUserId().equals(principal.getId())) {
            throw new IllegalArgumentException("Unable to add this report. Check the reference and tracking code.");
        }

        report.setReporterPublicUserId(principal.getId());
        reportRepository.save(report);

        auditService.logAction(
            principal.getId(),
            "REPORT_CLAIMED_BY_PUBLIC_USER",
            "INCIDENT_REPORT",
            report.getId(),
            null,
            "Public user claimed report " + report.getPublicReference(),
            null,
            null
        );

        return reportService.trackReport(report.getPublicReference(), null);
    }

    @Transactional
    public TrackedReportResponse submitResponseReview(
        String reportIdStr,
        UUID assignmentId,
        short rating,
        Short responseSpeed,
        Short professionalism,
        Short helpfulness,
        String comment
    ) {
        return reportService.createOrUpdateReview(reportIdStr, assignmentId, rating, responseSpeed, professionalism, helpfulness, comment);
    }

    @Transactional
    public AppInstallationEntity getOrCreateInstallation(String installationPublicId) {
        if (installationPublicId == null || installationPublicId.isBlank()) {
            return null;
        }

        String key = installationPublicId.trim();
        AppInstallationEntity inst = installationRepository.findByInstallationPublicId(key)
            .orElseGet(() -> {
                AppInstallationEntity newInst = new AppInstallationEntity(UUID.randomUUID(), key, null);
                return installationRepository.save(newInst);
            });

        inst.setLastSeenAt(LocalDateTime.now());
        return installationRepository.save(inst);
    }

    @Transactional
    public void linkInstallationToUser(String installationPublicId, UUID publicUserId) {
        AppInstallationEntity inst = getOrCreateInstallation(installationPublicId);
        if (inst != null) {
            inst.setPublicUserId(publicUserId);
            installationRepository.save(inst);
        }
    }

    public Map<String, Object> getCurrentPublicUserInfo() {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) {
            throw new ResourceNotFoundException("Not authenticated as a public user.");
        }

        PublicUserEntity user = principal.getUser();
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getId().toString());
        response.put("phoneNumber", user.getPhoneNumberNormalized());
        response.put("phoneVerified", user.isPhoneVerified());
        response.put("totpEnabled", user.isTotpEnabled());
        response.put("createdAt", user.getCreatedAt());

        return response;
    }

    public List<TrackedReportResponse> getMyReports(String installationPublicId) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        List<IncidentReportEntity> reports;

        if (principal != null) {
            reports = reportRepository.findByReporterPublicUserIdOrderByCreatedAtDesc(principal.getId());
        } else if (installationPublicId != null && !installationPublicId.isBlank()) {
            AppInstallationEntity inst = installationRepository.findByInstallationPublicId(installationPublicId.trim()).orElse(null);
            if (inst != null) {
                reports = reportRepository.findByInstallationIdOrderByCreatedAtDesc(inst.getId());
            } else {
                reports = Collections.emptyList();
            }
        } else {
            reports = Collections.emptyList();
        }

        return reports.stream().map(r -> {
            try {
                return reportService.trackReport(r.getPublicReference(), null);
            } catch (Exception e) {
                return new TrackedReportResponse(
                    r.getPublicReference(),
                    "Incident",
                    r.getStatus(),
                    r.getCreatedAt(),
                    r.getUpdatedAt(),
                    Set.of(),
                    List.of(),
                    r.getDescription(),
                    r.getLatitude(),
                    r.getLongitude(),
                    r.getLocality(),
                    List.of()
                );
            }
        }).toList();
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

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 4) + "***" + phone.substring(phone.length() - 3);
    }

    private String hashToken(String rawToken) {
        if (rawToken == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm unavailable", e);
        }
    }
}
