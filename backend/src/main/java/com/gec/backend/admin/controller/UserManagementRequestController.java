package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.CreateUserManagementRequest;
import com.gec.backend.admin.dto.UserManagementRequestResponse;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.MfaRecoveryRequestService;
import com.gec.backend.admin.service.UserManagementRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/user-requests")
public class UserManagementRequestController {

    private final UserManagementRequestService requestService;
    private final MfaRecoveryRequestService mfaRecoveryRequestService;

    public UserManagementRequestController(
        UserManagementRequestService requestService,
        MfaRecoveryRequestService mfaRecoveryRequestService
    ) {
        this.requestService = requestService;
        this.mfaRecoveryRequestService = mfaRecoveryRequestService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN_USER_READ')")
    public ResponseEntity<List<UserManagementRequestResponse>> getRequests() {
        return ResponseEntity.ok(requestService.getRequests());
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<UserManagementRequestResponse>> getMyRequests(@AuthenticationPrincipal AdminUserPrincipal principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(requestService.getMyRequests(principal.getId()));
    }

    @GetMapping("/my-requests/{requestId}")
    public ResponseEntity<UserManagementRequestResponse> getMyRequestById(
        @PathVariable UUID requestId,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(requestService.getMyRequestById(requestId, principal.getId()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN_USER_UPDATE') or hasAuthority('ADMIN_USER_CREATE') or hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<UserManagementRequestResponse> submitRequest(@Valid @RequestBody CreateUserManagementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.submitRequest(request));
    }

    @PostMapping("/{requestId}/approve")
    @PreAuthorize("hasAuthority('ADMIN_USER_CREATE') or hasAuthority('ADMIN_USER_UPDATE') or hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<UserManagementRequestResponse> approveRequest(@PathVariable UUID requestId) {
        return ResponseEntity.ok(requestService.approveRequest(requestId));
    }

    @PostMapping("/{requestId}/reject")
    @PreAuthorize("hasAuthority('ADMIN_USER_CREATE') or hasAuthority('ADMIN_USER_UPDATE') or hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<UserManagementRequestResponse> rejectRequest(
        @PathVariable UUID requestId,
        @RequestParam(required = false, defaultValue = "Request rejected.") String reason
    ) {
        return ResponseEntity.ok(requestService.rejectRequest(requestId, reason));
    }

    @PostMapping("/recovery/submit")
    public ResponseEntity<UserManagementRequestResponse> submitRecoveryRequest(
        @RequestBody(required = false) Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(mfaRecoveryRequestService.submitRecoveryRequest(principal.getId(), reason));
    }

    @PostMapping("/recovery/assisted-submit")
    @PreAuthorize("hasAuthority('ADMIN_USER_UPDATE') or hasAuthority('ADMIN_USER_CREATE') or hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<UserManagementRequestResponse> submitAssistedRecoveryRequest(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        UUID targetUserId = UUID.fromString(body.get("targetUserId"));
        String method = body.get("verificationMethod");
        String notes = body.get("verificationNotes");
        String reason = body.get("reason");
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(mfaRecoveryRequestService.submitAssistedRecoveryRequest(principal.getId(), targetUserId, method, notes, reason));
    }

    @PostMapping("/recovery/{requestId}/withdraw")
    public ResponseEntity<UserManagementRequestResponse> withdrawRecoveryRequest(
        @PathVariable UUID requestId,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(mfaRecoveryRequestService.withdrawRecoveryRequest(requestId, principal.getId()));
    }

    @PostMapping("/recovery/{requestId}/agency-verify")
    @PreAuthorize("hasAuthority('ADMIN_USER_UPDATE') or hasAuthority('ADMIN_USER_CREATE') or hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<UserManagementRequestResponse> agencyVerifyAndForward(
        @PathVariable UUID requestId,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String method = body != null ? body.get("verificationMethod") : "OFFICIAL_ID_CHECK";
        String notes = body != null ? body.get("verificationNotes") : "Verified staff identity";
        return ResponseEntity.ok(mfaRecoveryRequestService.agencyVerifyAndForward(requestId, principal.getId(), method, notes));
    }

    @PostMapping("/recovery/{requestId}/system-approve")
    @PreAuthorize("hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<UserManagementRequestResponse> systemApproveRecovery(
        @PathVariable UUID requestId,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(mfaRecoveryRequestService.systemApproveRecovery(requestId, principal.getId()));
    }

    @PostMapping("/recovery/{requestId}/reject")
    @PreAuthorize("hasAuthority('ADMIN_USER_UPDATE') or hasAuthority('ADMIN_USER_CREATE') or hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<UserManagementRequestResponse> rejectRecoveryRequest(
        @PathVariable UUID requestId,
        @RequestParam(required = false, defaultValue = "2FA recovery request rejected.") String reason,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(mfaRecoveryRequestService.rejectRecoveryRequest(requestId, principal.getId(), reason));
    }

    @PostMapping("/recovery/{requestId}/collect")
    public ResponseEntity<List<String>> collectRecoveryCodes(
        @PathVariable UUID requestId,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String password = body != null ? body.get("password") : null;
        return ResponseEntity.ok(mfaRecoveryRequestService.collectRecoveryCodes(requestId, principal.getId(), password));
    }
}
