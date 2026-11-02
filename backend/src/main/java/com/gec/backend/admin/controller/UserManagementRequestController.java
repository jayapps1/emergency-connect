package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.CreateUserManagementRequest;
import com.gec.backend.admin.dto.UserManagementRequestResponse;
import com.gec.backend.admin.service.UserManagementRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/user-requests")
public class UserManagementRequestController {

    private final UserManagementRequestService requestService;

    public UserManagementRequestController(UserManagementRequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN_USER_READ')")
    public ResponseEntity<List<UserManagementRequestResponse>> getRequests() {
        return ResponseEntity.ok(requestService.getRequests());
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
}
