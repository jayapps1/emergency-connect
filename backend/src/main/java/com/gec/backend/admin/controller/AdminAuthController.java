package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.AdminUserResponse;
import com.gec.backend.admin.dto.ChangePasswordRequest;
import com.gec.backend.admin.dto.LoginRequest;
import com.gec.backend.admin.dto.LoginResponse;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AdminAuthService;
import com.gec.backend.admin.service.MfaService;
import com.gec.backend.common.exception.ResourceNotFoundException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/admin/auth")
public class AdminAuthController {

    private final AdminAuthService authService;
    private final MfaService mfaService;
    private final AdminUserRepository userRepository;

    public AdminAuthController(AdminAuthService authService, MfaService mfaService, AdminUserRepository userRepository) {
        this.authService = authService;
        this.mfaService = mfaService;
        this.userRepository = userRepository;
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
    public ResponseEntity<AdminUserResponse> getCurrentUser(@AuthenticationPrincipal AdminUserPrincipal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(new AdminUserResponse(
            principal.getId(),
            principal.getUsername(),
            principal.getFirstName(),
            principal.getLastName(),
            principal.getPhoneNumber(),
            principal.getAgencyId(),
            null,
            principal.getRegion(),
            principal.getStationId(),
            null,
            principal.isEnabled(),
            !principal.isAccountNonLocked(),
            principal.isMustChangePassword(),
            principal.getLastLoginAt(),
            Set.of()
        ));
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
