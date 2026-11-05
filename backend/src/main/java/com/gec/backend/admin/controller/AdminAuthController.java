package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.entity.StaffEmailHistoryEntity;
import com.gec.backend.messaging.entity.StaffNotificationEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AdminAuthService;
import com.gec.backend.admin.service.MfaService;
import com.gec.backend.messaging.service.StaffNotificationService;
import com.gec.backend.common.exception.ResourceNotFoundException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/auth")
public class AdminAuthController {

    private final AdminAuthService authService;
    private final MfaService mfaService;
    private final AdminUserRepository userRepository;
    private final StaffNotificationService notificationService;

    public AdminAuthController(
        AdminAuthService authService,
        MfaService mfaService,
        AdminUserRepository userRepository,
        StaffNotificationService notificationService
    ) {
        this.authService = authService;
        this.mfaService = mfaService;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        LoginResponse response = authService.login(request, ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login/totp-direct")
    public ResponseEntity<LoginResponse> loginWithTotpDirect(
        @RequestBody Map<String, String> body,
        HttpServletRequest httpRequest
    ) {
        String email = body.get("email");
        String code = body.get("code");
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        LoginResponse response = authService.loginWithTotpDirect(email, code, ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mfa/totp/setup")
    public ResponseEntity<Map<String, String>> startTotpSetup(
        @RequestBody(required = false) Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        String challenge = body != null ? body.get("challenge") : null;
        if (challenge != null && !challenge.isBlank()) {
            return ResponseEntity.ok(mfaService.startTotpSetupWithChallenge(challenge));
        } else if (principal != null) {
            AdminUserEntity user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            return ResponseEntity.ok(mfaService.startTotpSetup(user));
        } else {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping("/mfa/totp/confirm")
    public ResponseEntity<Map<String, Object>> confirmTotpSetup(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        String challenge = body != null ? body.get("challenge") : null;
        String code = body != null ? body.get("code") : null;

        List<String> recoveryCodes;
        if (challenge != null && !challenge.isBlank()) {
            recoveryCodes = mfaService.confirmTotpSetupWithChallenge(challenge, code);
        } else if (principal != null) {
            AdminUserEntity user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            recoveryCodes = mfaService.confirmTotpSetup(user, code);
        } else {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(Map.of(
            "message", "TOTP MFA enabled successfully.",
            "recoveryCodes", recoveryCodes
        ));
    }

    @PostMapping("/mfa/totp/disable")
    public ResponseEntity<Map<String, String>> disableTotp(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        String password = body != null ? body.get("password") : null;
        AdminUserEntity user = userRepository.findById(principal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        mfaService.disableTotp(user, password);
        return ResponseEntity.ok(Map.of("message", "Authenticator 2-Step Verification disabled successfully."));
    }

    @PostMapping("/mfa/totp/verify")
    public ResponseEntity<LoginResponse> verifyMfaTotp(
        @RequestBody Map<String, String> body,
        HttpServletRequest httpRequest
    ) {
        String challenge = body.get("challenge");
        String code = body.get("code");
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        AdminUserEntity user = mfaService.verifyMfaChallenge(challenge, code);
        LoginResponse response = authService.finalizeAuthenticatedLogin(user, ipAddress, userAgent);

        String refreshToken = authService.createRefreshToken(user.getId());
        ResponseCookie cookie = ResponseCookie.from("gec_refresh_token", refreshToken)
            .httpOnly(true)
            .secure(false)
            .path("/api/v1/admin/auth")
            .maxAge(7 * 24 * 60 * 60)
            .sameSite("Lax")
            .build();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .body(response);
    }

    @PostMapping("/mfa/recovery/verify")
    public ResponseEntity<LoginResponse> verifyMfaRecovery(
        @RequestBody Map<String, String> body,
        HttpServletRequest httpRequest
    ) {
        String challenge = body.get("challenge");
        String recoveryCode = body.get("recoveryCode");
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        AdminUserEntity user = mfaService.verifyMfaRecoveryCode(challenge, recoveryCode);
        LoginResponse response = authService.finalizeAuthenticatedLogin(user, ipAddress, userAgent);

        String refreshToken = authService.createRefreshToken(user.getId());
        ResponseCookie cookie = ResponseCookie.from("gec_refresh_token", refreshToken)
            .httpOnly(true)
            .secure(false)
            .path("/api/v1/admin/auth")
            .maxAge(7 * 24 * 60 * 60)
            .sameSite("Lax")
            .build();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .body(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(HttpServletRequest httpRequest) {
        String refreshToken = null;
        if (httpRequest.getCookies() != null) {
            refreshToken = Arrays.stream(httpRequest.getCookies())
                .filter(c -> "gec_refresh_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
        }

        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        LoginResponse response = authService.refreshAccessToken(refreshToken, ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        HttpServletRequest httpRequest,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        String refreshToken = null;
        if (httpRequest.getCookies() != null) {
            refreshToken = Arrays.stream(httpRequest.getCookies())
                .filter(c -> "gec_refresh_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
        }

        if (principal != null) {
            authService.logout(refreshToken, principal.getId());
        }

        ResponseCookie cookie = ResponseCookie.from("gec_refresh_token", "")
            .httpOnly(true)
            .path("/api/v1/admin/auth")
            .maxAge(0)
            .build();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .build();
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponse> getCurrentUser(@AuthenticationPrincipal AdminUserPrincipal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        AdminUserEntity user = userRepository.findById(principal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(authService.getLoginResponseForUser(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<LoginResponse> updateProfile(
        @Valid @RequestBody UpdateStaffProfileRequest request,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(authService.updateProfile(principal.getId(), request));
    }

    @PostMapping("/email-change-request")
    public ResponseEntity<Map<String, Object>> requestEmailChange(
        @Valid @RequestBody StaffEmailChangeRequestDto request,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(authService.requestEmailChange(principal.getId(), request));
    }

    @GetMapping("/email-change-status")
    public ResponseEntity<Map<String, Object>> getEmailChangeStatus(
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(authService.getEmailChangeStatus(principal.getId()));
    }

    @PostMapping("/complete-email-change")
    public ResponseEntity<LoginResponse> completeEmailChange(
        @Valid @RequestBody CompleteEmailChangeRequest request,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(authService.completeEmailChange(principal.getId(), request));
    }

    @PostMapping("/verify-password")
    public ResponseEntity<Map<String, Object>> verifyPassword(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        String password = body != null ? body.get("password") : null;
        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Current password is required."));
        }
        return ResponseEntity.ok(authService.verifyPasswordForEmailChange(principal.getId(), password));
    }

    @PostMapping("/change-email-direct")
    @PreAuthorize("hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<LoginResponse> changeEmailDirect(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        String token = body.get("verificationToken");
        String newEmail = body.get("newEmail");
        String confirmNewEmail = body.get("confirmNewEmail");
        return ResponseEntity.ok(authService.changeEmailDirect(principal.getId(), token, newEmail, confirmNewEmail));
    }

    @PostMapping("/generate-recovery-codes-direct")
    @PreAuthorize("hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<String>> generateRecoveryCodesDirect(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        String token = body != null ? body.get("verificationToken") : null;
        return ResponseEntity.ok(authService.generateRecoveryCodesDirect(principal.getId(), token));
    }

    @GetMapping("/email-history")
    public ResponseEntity<List<StaffEmailHistoryEntity>> getEmailHistory(
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(authService.getEmailHistory(principal.getId()));
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<StaffNotificationEntity>> getNotifications(
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(notificationService.getUserNotifications(principal.getId()));
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markNotificationRead(
        @PathVariable UUID id,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        notificationService.markAsRead(id, principal.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllNotificationsRead(
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        notificationService.markAllAsRead(principal.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<Void> deleteNotification(
        @PathVariable UUID id,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        notificationService.deleteNotification(id, principal.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/notifications/read")
    public ResponseEntity<Void> deleteAllReadNotifications(
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        notificationService.deleteAllRead(principal.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
        @Valid @RequestBody ChangePasswordRequest request,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        authService.changePassword(principal.getId(), request);
        return ResponseEntity.ok().build();
    }
}
