package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.*;
import com.gec.backend.admin.repository.*;
import com.gec.backend.admin.security.*;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.messaging.service.StaffNotificationService;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.repository.StationRepository;
import com.gec.backend.common.exception.ResourceNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AdminAuthService {

    public record EmailChangeEligibilityResult(
        boolean canRequestEmailChange,
        boolean hasPendingEmailChange,
        String pendingRequestedEmail,
        LocalDateTime nextEligibleAt,
        String statusReason
    ) {}

    private static record VerificationTokenRecord(
        String token,
        UUID userId,
        LocalDateTime expiresAt,
        boolean used
    ) {}

    private final Map<String, VerificationTokenRecord> verificationTokenRegistry = new ConcurrentHashMap<>();

    private final AdminUserRepository userRepository;
    private final AdminRefreshTokenRepository refreshTokenRepository;
    private final UserManagementRequestRepository requestRepository;
    private final StaffEmailHistoryRepository emailHistoryRepository;
    private final AgencyRepository agencyRepository;
    private final StationRepository stationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final MfaService mfaService;
    private final AdminScopeService scopeService;
    private final StaffNotificationService notificationService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminAuthService(
        AdminUserRepository userRepository,
        AdminRefreshTokenRepository refreshTokenRepository,
        UserManagementRequestRepository requestRepository,
        StaffEmailHistoryRepository emailHistoryRepository,
        AgencyRepository agencyRepository,
        StationRepository stationRepository,
        PasswordEncoder passwordEncoder,
        JwtTokenProvider tokenProvider,
        MfaService mfaService,
        AdminScopeService scopeService,
        StaffNotificationService notificationService,
        AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.requestRepository = requestRepository;
        this.emailHistoryRepository = emailHistoryRepository;
        this.agencyRepository = agencyRepository;
        this.stationRepository = stationRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.mfaService = mfaService;
        this.scopeService = scopeService;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    // Allows staff to maintain personal contact information while preventing self-service changes to role, operational scope, or permissions.
    @Transactional
    public LoginResponse updateProfile(UUID userId, UpdateStaffProfileRequest request) {
        AdminUserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        if (request.phoneNumber() != null && !request.phoneNumber().isBlank()) {
            user.setPhoneNumber(request.phoneNumber().trim());
        }
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        auditService.logAction(userId, "STAFF_PROFILE_UPDATED", "ADMIN_USER", userId, user.getAgencyId(),
            "Updated staff profile name and contact information", null, null);

        return getLoginResponseForUser(user);
    }

    // Blocks duplicate pending requests while applying shorter retry eligibility (1 hour) after rejection and a longer identity-change cooldown (30 days) after approval.
    public EmailChangeEligibilityResult evaluateEmailChangeEligibility(UUID userId) {
        if (scopeService.isSystemAdmin()) {
            return new EmailChangeEligibilityResult(true, false, null, null, "SYSTEM_ADMIN_DIRECT");
        }

        // Rule 1: Pending Request Block
        Optional<UserManagementRequestEntity> pendingOpt = requestRepository
            .findTopByRequestedByAndRequestTypeAndStatusInOrderByCreatedAtDesc(userId, "EMAIL_CHANGE", List.of("PENDING"));

        if (pendingOpt.isPresent()) {
            UserManagementRequestEntity pendingReq = pendingOpt.get();
            String pendingEmail = parseRequestedEmailFromReason(pendingReq.getReason());
            return new EmailChangeEligibilityResult(false, true, pendingEmail, null, "PENDING_REQUEST");
        }

        // Rule 2: Most recent decided request (APPROVED, COMPLETED, or REJECTED)
        Optional<UserManagementRequestEntity> latestOpt = requestRepository
            .findTopByRequestedByAndRequestTypeAndStatusInOrderByCreatedAtDesc(userId, "EMAIL_CHANGE", List.of("APPROVED", "COMPLETED", "REJECTED"));

        if (latestOpt.isPresent()) {
            UserManagementRequestEntity latest = latestOpt.get();
            LocalDateTime decisionTime = latest.getReviewedAt() != null ? latest.getReviewedAt() : latest.getUpdatedAt();

            if ("REJECTED".equalsIgnoreCase(latest.getStatus())) {
                // Allows another request 1 hour after the administrator's rejection because the staff identity itself was not changed.
                LocalDateTime nextEligibleAt = decisionTime.plusHours(1);
                if (LocalDateTime.now().isBefore(nextEligibleAt)) {
                    return new EmailChangeEligibilityResult(false, false, null, nextEligibleAt, "REJECTED_COOLDOWN");
                }
            } else if ("APPROVED".equalsIgnoreCase(latest.getStatus()) || "COMPLETED".equalsIgnoreCase(latest.getStatus())) {
                // Applies the longer cooldown (30 days) from the successful identity-change decision so repeated login-email changes remain controlled.
                LocalDateTime nextEligibleAt = decisionTime.plusDays(30);
                if (LocalDateTime.now().isBefore(nextEligibleAt)) {
                    return new EmailChangeEligibilityResult(false, false, null, nextEligibleAt, "APPROVED_COOLDOWN");
                }
            }
        }

        return new EmailChangeEligibilityResult(true, false, null, null, "ELIGIBLE");
    }

    private String parseRequestedEmailFromReason(String reasonStr) {
        if (reasonStr == null) return null;
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("(?i)requested\\s+new\\s+email:\\s*([^\\s\\)]+)")
            .matcher(reasonStr);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        if (reasonStr.contains("(Requested New Email: ") && reasonStr.contains(")")) {
            int start = reasonStr.indexOf("(Requested New Email: ") + "(Requested New Email: ".length();
            int end = reasonStr.indexOf(")", start);
            if (start < end) {
                return reasonStr.substring(start, end).trim();
            }
        }
        return null;
    }

    // Routes login-email changes through System Administration for non-System-Admin staff while preventing duplicate pending requests and enforcing the cooldown.
    @Transactional
    public Map<String, Object> requestEmailChange(UUID userId, StaffEmailChangeRequestDto request) {
        if (scopeService.isSystemAdmin()) {
            throw new IllegalStateException("EMAIL_CHANGE_REQUEST_NOT_REQUIRED_FOR_SYSTEM_ADMIN: System Administrators do not use approval requests. Use direct Change Email in profile.");
        }

        EmailChangeEligibilityResult eligibility = evaluateEmailChangeEligibility(userId);
        if (!eligibility.canRequestEmailChange()) {
            if (eligibility.hasPendingEmailChange()) {
                throw new IllegalStateException("EMAIL_CHANGE_REQUEST_ALREADY_PENDING: You already have an email change request awaiting review.");
            }
            throw new IllegalStateException("EMAIL_CHANGE_COOLDOWN_ACTIVE: You can request another email change on " + eligibility.nextEligibleAt());
        }

        AdminUserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        String targetEmail = request.requestedEmail().trim().toLowerCase(Locale.US);
        if (userRepository.existsByEmailIgnoreCase(targetEmail)) {
            throw new IllegalArgumentException("Requested email address " + targetEmail + " is already registered to another account.");
        }

        UUID agencyId = user.getAgencyId() != null ? user.getAgencyId() : UUID.randomUUID();

        UserManagementRequestEntity reqEntity = new UserManagementRequestEntity(
            UUID.randomUUID(),
            "EMAIL_CHANGE",
            user.getId(),
            agencyId,
            request.reason() + " (Requested New Email: " + targetEmail + ")",
            null,
            user.getId()
        );
        requestRepository.save(reqEntity);

        auditService.logAction(userId, "STAFF_EMAIL_CHANGE_REQUESTED", "USER_MANAGEMENT_REQUEST", reqEntity.getId(), agencyId,
            "Submitted email change request to " + targetEmail, null, null);

        return Map.of("requestId", reqEntity.getId().toString(), "status", "PENDING", "requestedEmail", targetEmail);
    }

    public Map<String, Object> getEmailChangeStatus(UUID userId) {
        Map<String, Object> res = new HashMap<>();

        if (scopeService.isSystemAdmin()) {
            res.put("status", "SYSTEM_ADMIN_DIRECT");
            res.put("emailChangeAllowed", true);
            res.put("hasPendingEmailChange", false);
            res.put("pendingRequestedEmail", null);
            res.put("nextEmailChangeEligibleAt", null);
            return res;
        }

        EmailChangeEligibilityResult eligibility = evaluateEmailChangeEligibility(userId);

        res.put("status", eligibility.statusReason());
        res.put("emailChangeAllowed", eligibility.canRequestEmailChange());
        res.put("hasPendingEmailChange", eligibility.hasPendingEmailChange());
        res.put("pendingRequestedEmail", eligibility.pendingRequestedEmail());
        res.put("nextEmailChangeEligibleAt", eligibility.nextEligibleAt() != null ? eligibility.nextEligibleAt().toString() : null);

        return res;
    }

    // Separates password verification from the new-email step so the current credential is confirmed before identity information can be modified.
    public Map<String, Object> verifyPasswordForEmailChange(UUID userId, String password) {
        AdminUserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect.");
        }

        String verificationToken = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5);

        verificationTokenRegistry.put(verificationToken, new VerificationTokenRecord(verificationToken, userId, expiresAt, false));

        return Map.of(
            "verificationToken", verificationToken,
            "expiresAt", expiresAt.toString(),
            "verified", true
        );
    }

    // Direct self-service recovery code generation for System Administration
    @Transactional
    public List<String> generateRecoveryCodesDirect(UUID sysAdminId, String verificationToken) {
        if (!scopeService.isSystemAdmin()) {
            throw new IllegalStateException("Access restricted to System Administrators.");
        }

        if (verificationToken == null || !verificationTokenRegistry.containsKey(verificationToken)) {
            throw new BadCredentialsException("Invalid or missing password verification token. Please verify current password first.");
        }

        VerificationTokenRecord record = verificationTokenRegistry.get(verificationToken);
        if (record.used() || record.expiresAt().isBefore(LocalDateTime.now()) || !record.userId().equals(sysAdminId)) {
            verificationTokenRegistry.remove(verificationToken);
            throw new BadCredentialsException("Verification token has expired or is invalid. Please confirm current password again.");
        }

        // Consume verification token (single-use)
        verificationTokenRegistry.remove(verificationToken);

        // Generate 10 new recovery codes and store hashes in DB
        List<String> plaintextCodes = mfaService.generateAndSaveRecoveryCodes("ADMIN", sysAdminId);

        // Persist notification for System Admin (NO codes in notification text)
        notificationService.sendNotification(
            sysAdminId,
            "Recovery Codes Regenerated",
            "Your 2FA recovery codes were regenerated successfully. If you did not perform this action, contact security administration immediately.",
            "SECURITY_ALERT",
            "/profile"
        );

        auditService.logAction(sysAdminId, "SYSTEM_ADMIN_RECOVERY_CODES_REISSUED", "ADMIN_USER", sysAdminId, null,
            "System Admin directly regenerated 2FA recovery codes after password verification", null, null);

        return plaintextCodes;
    }

    // Allows System Administrators to maintain their own login email directly while preserving stronger re-authentication and audit controls.
    @Transactional
    public LoginResponse changeEmailDirect(UUID userId, String verificationToken, String newEmail, String confirmNewEmail) {
        if (verificationToken == null || !verificationTokenRegistry.containsKey(verificationToken)) {
            throw new BadCredentialsException("Invalid or missing password verification token. Please verify password first.");
        }

        VerificationTokenRecord record = verificationTokenRegistry.get(verificationToken);
        if (record.used() || record.expiresAt().isBefore(LocalDateTime.now()) || !record.userId().equals(userId)) {
            verificationTokenRegistry.remove(verificationToken);
            throw new BadCredentialsException("Verification token has expired or is invalid. Please confirm current password again.");
        }

        // Consume verification token immediately (single-use)
        verificationTokenRegistry.remove(verificationToken);

        if (newEmail == null || newEmail.isBlank() || confirmNewEmail == null || confirmNewEmail.isBlank()) {
            throw new IllegalArgumentException("New email address and confirmation email address are required.");
        }

        String cleanNewEmail = newEmail.trim().toLowerCase(Locale.US);
        String cleanConfirmEmail = confirmNewEmail.trim().toLowerCase(Locale.US);

        if (!cleanNewEmail.equals(cleanConfirmEmail)) {
            throw new IllegalArgumentException("New email address and confirmation email address do not match.");
        }

        AdminUserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (cleanNewEmail.equalsIgnoreCase(user.getEmail())) {
            throw new IllegalArgumentException("New email address must be different from current email address.");
        }

        if (userRepository.existsByEmailIgnoreCase(cleanNewEmail)) {
            throw new IllegalArgumentException("Requested email address " + cleanNewEmail + " is already in use by another account.");
        }

        String oldEmail = user.getEmail();
        user.setEmail(cleanNewEmail);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Preserves immutable email identity history so prior login addresses and administrative decisions remain auditable after subsequent changes.
        StaffEmailHistoryEntity history = new StaffEmailHistoryEntity(
            UUID.randomUUID(),
            userId,
            oldEmail,
            cleanNewEmail,
            "SELF_SERVICE_SYSTEM_ADMIN",
            null,
            userId,
            "System Admin direct self-service login email update",
            null,
            LocalDateTime.now()
        );
        emailHistoryRepository.save(history);

        // Invalidate refresh tokens server-side to require re-authentication with new email
        refreshTokenRepository.deleteByUserId(user.getId());

        auditService.logAction(userId, "SYSTEM_ADMIN_EMAIL_CHANGED", "ADMIN_USER", userId, user.getAgencyId(),
            "System Admin directly updated email from " + oldEmail + " to " + cleanNewEmail, null, null);

        verificationTokenRegistry.remove(verificationToken);

        return getLoginResponseForUser(user);
    }

    public List<StaffEmailHistoryEntity> getEmailHistory(UUID userId) {
        if (scopeService.isSystemAdmin()) {
            return emailHistoryRepository.findAllByOrderByChangedAtDesc();
        } else {
            return emailHistoryRepository.findByStaffUserIdOrderByChangedAtDesc(userId);
        }
    }

    @Transactional
    public LoginResponse completeEmailChange(UUID userId, CompleteEmailChangeRequest request) {
        AdminUserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect.");
        }

        UserManagementRequestEntity req = requestRepository
            .findTopByRequestedByAndRequestTypeAndStatusInOrderByCreatedAtDesc(userId, "EMAIL_CHANGE", List.of("APPROVED"))
            .orElseThrow(() -> new ResourceNotFoundException("No approved email change request found for this user."));

        String reasonStr = req.getReason();
        String targetEmail = null;
        if (reasonStr.contains("(Requested New Email: ") && reasonStr.contains(")")) {
            int start = reasonStr.indexOf("(Requested New Email: ") + "(Requested New Email: ".length();
            int end = reasonStr.indexOf(")", start);
            if (start < end) {
                targetEmail = reasonStr.substring(start, end).trim();
            }
        }

        if (targetEmail == null || targetEmail.isBlank()) {
            throw new IllegalStateException("Unable to resolve approved target email.");
        }

        user.setEmail(targetEmail);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        req.setStatus("COMPLETED");
        req.setUpdatedAt(LocalDateTime.now());
        requestRepository.save(req);

        auditService.logAction(userId, "STAFF_EMAIL_CHANGED", "ADMIN_USER", userId, user.getAgencyId(),
            "Completed login email update to " + targetEmail, null, null);

        return getLoginResponseForUser(user);
    }

    /**
     * Password and authenticator-code login are independent authentication
     * methods that produce the same staff session.
     */
    @Transactional
    public LoginResponse login(LoginRequest request, String ipAddress, String userAgent) {
        AdminUserEntity user = userRepository.findByEmailIgnoreCase(request.email().trim().toLowerCase(Locale.US))
            .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        if (!user.isActive()) {
            auditService.logAction(user.getId(), "LOGIN_FAILED_INACTIVE", "ADMIN_USER", user.getId(), user.getAgencyId(), "Attempted login to inactive account", ipAddress, userAgent);
            throw new BadCredentialsException("Invalid email or password.");
        }

        if (user.isLocked()) {
            auditService.logAction(user.getId(), "LOGIN_FAILED_LOCKED", "ADMIN_USER", user.getId(), user.getAgencyId(), "Attempted login to locked account", ipAddress, userAgent);
            throw new BadCredentialsException("Account is locked due to multiple failed login attempts.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= 5) {
                user.setLocked(true);
            }
            userRepository.save(user);
            auditService.logAction(user.getId(), "LOGIN_FAILED", "ADMIN_USER", user.getId(), user.getAgencyId(), "Failed login attempt " + attempts, ipAddress, userAgent);
            throw new BadCredentialsException("Invalid email or password.");
        }

        if (user.isMustChangePassword() && user.getTemporaryPasswordIssuedAt() != null) {
            if (user.getTemporaryPasswordIssuedAt().plusHours(48).isBefore(LocalDateTime.now())) {
                auditService.logAction(user.getId(), "LOGIN_FAILED_EXPIRED_TEMP_PASSWORD", "ADMIN_USER", user.getId(), user.getAgencyId(), "Temporary password expired", ipAddress, userAgent);
                throw new BadCredentialsException("Your temporary password has expired. Contact your administrator for a new temporary password.");
            }
        }

        user.setFailedLoginAttempts(0);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        if (!user.isTotpEnabled()) {
            String mfaChallenge = mfaService.createMfaChallenge(user.getId());
            Set<String> roleCodes = getRoleCodes(user);
            Set<String> permCodes = getPermCodes(user);
            AdminUserResponse userResp = mapToUserResponse(user, roleCodes);
            AdminUserPrincipal principal = new AdminUserPrincipal(user);
            String accessToken = tokenProvider.generateToken(principal);
            return new LoginResponse(accessToken, tokenProvider.getExpirationInSeconds(), userResp, roleCodes, permCodes, "MFA_SETUP_REQUIRED", mfaChallenge);
        }

        return finalizeAuthenticatedLogin(user, ipAddress, userAgent);
    }

    /**
     * Authenticator-only login method using 6-digit TOTP code.
     */
    @Transactional
    public LoginResponse loginWithTotpDirect(String email, String code, String ipAddress, String userAgent) {
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            throw new BadCredentialsException("Email and authenticator code are required.");
        }

        AdminUserEntity user = userRepository.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.US))
            .orElseThrow(() -> new BadCredentialsException("Incorrect or expired authenticator code. Please try again."));

        if (!user.isActive() || user.isLocked()) {
            throw new BadCredentialsException("Incorrect or expired authenticator code. Please try again.");
        }

        if (!user.isTotpEnabled() || user.getTotpSecretEncrypted() == null) {
            throw new BadCredentialsException("Authenticator 2-Step Verification is not configured for this account. Please sign in with Password.");
        }

        boolean valid = mfaService.verifyTotpCodeDirect(user, code.trim());
        if (!valid) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= 5) {
                user.setLocked(true);
            }
            userRepository.save(user);
            auditService.logAction(user.getId(), "TOTP_LOGIN_FAILED", "ADMIN_USER", user.getId(), user.getAgencyId(), "Failed TOTP direct login attempt " + attempts, ipAddress, userAgent);
            throw new BadCredentialsException("Incorrect or expired authenticator code. Please try again.");
        }

        user.setFailedLoginAttempts(0);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return finalizeAuthenticatedLogin(user, ipAddress, userAgent);
    }

    @Transactional
    public LoginResponse finalizeAuthenticatedLogin(AdminUserEntity user, String ipAddress, String userAgent) {
        AdminUserPrincipal principal = new AdminUserPrincipal(user);
        String accessToken = tokenProvider.generateToken(principal);

        auditService.logAction(user.getId(), "LOGIN_SUCCESS", "ADMIN_USER", user.getId(), user.getAgencyId(), "Successful admin login", ipAddress, userAgent);

        Set<String> roleCodes = getRoleCodes(user);
        Set<String> permCodes = getPermCodes(user);
        AdminUserResponse userResponse = mapToUserResponse(user, roleCodes);

        return new LoginResponse(accessToken, tokenProvider.getExpirationInSeconds(), userResponse, roleCodes, permCodes, "AUTHENTICATED", null);
    }

    @Transactional
    public String createRefreshToken(UUID userId) {
        String rawToken = generateRawToken();
        String tokenHash = hashToken(rawToken);

        AdminRefreshTokenEntity tokenEntity = new AdminRefreshTokenEntity(
            UUID.randomUUID(),
            userId,
            tokenHash,
            LocalDateTime.now().plusDays(7)
        );
        refreshTokenRepository.save(tokenEntity);
        return rawToken;
    }

    @Transactional
    public LoginResponse refreshAccessToken(String rawRefreshToken, String ipAddress, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new BadCredentialsException("Missing refresh token.");
        }

        String hash = hashToken(rawRefreshToken);
        AdminRefreshTokenEntity token = refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash)
            .orElseThrow(() -> new BadCredentialsException("Invalid or revoked refresh token."));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("Refresh token has expired.");
        }

        AdminUserEntity user = userRepository.findById(token.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found for token."));

        token.setLastUsedAt(LocalDateTime.now());
        refreshTokenRepository.save(token);

        AdminUserPrincipal principal = new AdminUserPrincipal(user);
        String newAccessToken = tokenProvider.generateToken(principal);

        Set<String> roleCodes = getRoleCodes(user);
        Set<String> permCodes = getPermCodes(user);
        AdminUserResponse userResponse = mapToUserResponse(user, roleCodes);

        return new LoginResponse(newAccessToken, tokenProvider.getExpirationInSeconds(), userResponse, roleCodes, permCodes, "AUTHENTICATED", null);
    }

    @Transactional
    public void logout(String rawRefreshToken, UUID actorUserId) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String hash = hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash).ifPresent(t -> {
                t.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(t);
            });
        }
        if (actorUserId != null) {
            auditService.logAction(actorUserId, "LOGOUT", "ADMIN_USER", actorUserId, null, "User logged out", null, null);
        }
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        AdminUserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);

        refreshTokenRepository.deleteByUserId(userId);

        auditService.logAction(userId, "PASSWORD_CHANGED", "ADMIN_USER", userId, user.getAgencyId(), "Admin password changed successfully", null, null);
    }

    // Restores the complete staff authorization context before protected routes evaluate role permissions after a browser refresh.
    public LoginResponse getLoginResponseForUser(AdminUserEntity user) {
        AdminUserPrincipal principal = new AdminUserPrincipal(user);
        String accessToken = tokenProvider.generateToken(principal);

        Set<String> roleCodes = getRoleCodes(user);
        Set<String> permCodes = getPermCodes(user);
        AdminUserResponse userResponse = mapToUserResponse(user, roleCodes);

        return new LoginResponse(accessToken, tokenProvider.getExpirationInSeconds(), userResponse, roleCodes, permCodes, "AUTHENTICATED", null);
    }

    private Set<String> getRoleCodes(AdminUserEntity user) {
        if (user.getRoles() == null) return Collections.emptySet();
        return user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toSet());
    }

    private Set<String> getPermCodes(AdminUserEntity user) {
        if (user.getRoles() == null) return Collections.emptySet();
        Set<String> permCodes = new HashSet<>();
        user.getRoles().forEach(r -> {
            if (r.getPermissions() != null) {
                r.getPermissions().forEach(p -> permCodes.add(p.getCode()));
            }
        });
        return permCodes;
    }

    private AdminUserResponse mapToUserResponse(AdminUserEntity user, Set<String> roleCodes) {
        String agencyName = user.getAgencyId() != null
            ? agencyRepository.findById(user.getAgencyId()).map(AgencyEntity::getName).orElse(null)
            : null;

        String stationName = user.getStationId() != null
            ? stationRepository.findById(user.getStationId()).map(StationEntity::getName).orElse(null)
            : null;

        return new AdminUserResponse(
            user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getPhoneNumber(),
            user.getAgencyId(), agencyName, user.getRegion(), user.getStationId(), stationName, user.getPriorityLevel(),
            user.isActive(), user.isLocked(), user.isMustChangePassword(), user.isTotpEnabled(), user.getLastLoginAt(), roleCodes
        );
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
