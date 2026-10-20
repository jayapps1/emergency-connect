package com.gec.backend.publicuser.controller;

import com.gec.backend.publicuser.entity.PublicAuthSessionEntity;
import com.gec.backend.publicuser.entity.PublicSecurityEventEntity;
import com.gec.backend.publicuser.security.PublicUserPrincipal;
import com.gec.backend.publicuser.service.PublicSessionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/account")
public class PublicAccountSecurityController {

    private final PublicSessionService sessionService;

    public PublicAccountSecurityController(PublicSessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping("/mfa/totp/setup")
    public ResponseEntity<Map<String, String>> startPublicTotpSetup() {
        return ResponseEntity.ok(sessionService.startPublicTotpSetup());
    }

    @PostMapping("/mfa/totp/confirm")
    public ResponseEntity<Map<String, String>> confirmPublicTotpSetup(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        return ResponseEntity.ok(sessionService.confirmPublicTotpSetup(code));
    }

    @PostMapping("/mfa/totp/disable")
    public ResponseEntity<Map<String, String>> disablePublicTotp() {
        return ResponseEntity.ok(sessionService.disablePublicTotp());
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<PublicAuthSessionEntity>> getActiveSessions() {
        return ResponseEntity.ok(sessionService.getActiveSessions());
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> revokeSession(@PathVariable UUID sessionId) {
        sessionService.revokeSession(sessionId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sessions/revoke-all")
    public ResponseEntity<Void> revokeAllSessions(@AuthenticationPrincipal PublicUserPrincipal principal) {
        if (principal != null) {
            sessionService.revokeAllUserSessions(principal.getId(), "USER_REVOKED_ALL");
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/change-phone/request-otp")
    public ResponseEntity<Map<String, String>> requestPhoneChangeOtp(@RequestBody Map<String, String> body) {
        String newPhone = body.get("newPhoneNumber");
        return ResponseEntity.ok(sessionService.requestPhoneChangeOtp(newPhone));
    }

    @PostMapping("/change-phone/verify-otp")
    public ResponseEntity<Void> verifyPhoneChangeOtp(@RequestBody Map<String, String> body) {
        String newPhone = body.get("newPhoneNumber");
        String code = body.get("code");
        sessionService.verifyAndChangePhoneNumber(newPhone, code);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/security-activity")
    public ResponseEntity<Page<PublicSecurityEventEntity>> getSecurityActivity(Pageable pageable) {
        return ResponseEntity.ok(sessionService.getSecurityActivity(pageable));
    }
}
