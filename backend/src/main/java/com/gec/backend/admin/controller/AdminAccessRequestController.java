package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.service.AdminAccessRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/admin-access-requests")
public class AdminAccessRequestController {

    private final AdminAccessRequestService requestService;

    public AdminAccessRequestController(AdminAccessRequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN_USER_READ')")
    public ResponseEntity<List<AdminAccessRequestResponse>> getRequests() {
        return ResponseEntity.ok(requestService.getRequests());
    }

    @GetMapping("/centralized-summary")
    @PreAuthorize("hasAuthority('ADMIN_USER_READ')")
    public ResponseEntity<CentralizedRequestSummaryDto> getCentralizedSummary() {
        return ResponseEntity.ok(requestService.getCentralizedSummary());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN_USER_CREATE')")
    public ResponseEntity<AdminAccessRequestResponse> submitRequest(@Valid @RequestBody CreateAdminAccessRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.submitRequest(request));
    }

    @PostMapping("/{requestId}/approve")
    @PreAuthorize("hasAuthority('ADMIN_USER_CREATE')")
    public ResponseEntity<ApproveAccessRequestResponse> approveRequest(@PathVariable UUID requestId) {
        return ResponseEntity.ok(requestService.approveRequest(requestId));
    }

    @PostMapping("/{requestId}/reject")
    @PreAuthorize("hasAuthority('ADMIN_USER_CREATE')")
    public ResponseEntity<AdminAccessRequestResponse> rejectRequest(
        @PathVariable UUID requestId,
        @RequestParam(required = false, defaultValue = "Request rejected by administrator.") String reason
    ) {
        return ResponseEntity.ok(requestService.rejectRequest(requestId, reason));
    }
}
