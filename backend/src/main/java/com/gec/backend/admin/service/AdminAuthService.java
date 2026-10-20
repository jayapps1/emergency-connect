package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.*;
import com.gec.backend.admin.repository.*;
import com.gec.backend.admin.security.*;
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
import java.util.stream.Collectors;

@Service
public class AdminAuthService {

    private final AdminUserRepository userRepository;
    private final AdminRefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final MfaService mfaService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminAuthService(
        AdminUserRepository userRepository,
        AdminRefreshTokenRepository refreshTokenRepository,
        PasswordEncoder passwordEncoder,
        JwtTokenProvider tokenProvider,
        MfaService mfaService,
        AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.mfaService = mfaService;
        this.auditService = auditService;
    }

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

        Set<String> roleCodes = user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toSet());
        Set<String> permCodes = new HashSet<>();
        user.getRoles().forEach(r -> r.getPermissions().forEach(p -> permCodes.add(p.getCode())));

        AdminUserResponse userResponse = new AdminUserResponse(
            user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getPhoneNumber(),
            user.getAgencyId(), null, user.getRegion(), user.getStationId(), null, user.isActive(), user.isLocked(),
            user.isMustChangePassword(), user.getLastLoginAt(), roleCodes
        );

        String mfaChallenge = mfaService.createMfaChallenge(user.getId());
        String authState = user.isTotpEnabled() ? "MFA_REQUIRED" : "MFA_SETUP_REQUIRED";

        auditService.logAction(user.getId(), "PASSWORD_VERIFIED", "ADMIN_USER", user.getId(), user.getAgencyId(), "Password verified, MFA challenge issued (" + authState + ")", ipAddress, userAgent);

        return new LoginResponse(null, 0, userResponse, roleCodes, permCodes, authState, mfaChallenge);
    }

    @Transactional
    public LoginResponse finalizeAuthenticatedLogin(AdminUserEntity user, String ipAddress, String userAgent) {
        AdminUserPrincipal principal = new AdminUserPrincipal(user);
        String accessToken = tokenProvider.generateToken(principal);

        auditService.logAction(user.getId(), "LOGIN_SUCCESS", "ADMIN_USER", user.getId(), user.getAgencyId(), "Successful admin MFA login", ipAddress, userAgent);

        Set<String> roleCodes = user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toSet());
        Set<String> permCodes = new HashSet<>();
        user.getRoles().forEach(r -> r.getPermissions().forEach(p -> permCodes.add(p.getCode())));

        AdminUserResponse userResponse = new AdminUserResponse(
            user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getPhoneNumber(),
            user.getAgencyId(), null, user.getRegion(), user.getStationId(), null, user.isActive(), user.isLocked(),
            user.isMustChangePassword(), user.getLastLoginAt(), roleCodes
        );

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

        Set<String> roleCodes = user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toSet());
        Set<String> permCodes = new HashSet<>();
        user.getRoles().forEach(r -> r.getPermissions().forEach(p -> permCodes.add(p.getCode())));

        AdminUserResponse userResponse = new AdminUserResponse(
            user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getPhoneNumber(),
            user.getAgencyId(), null, user.getRegion(), user.getStationId(), null, user.isActive(), user.isLocked(),
            user.isMustChangePassword(), user.getLastLoginAt(), roleCodes
        );

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
