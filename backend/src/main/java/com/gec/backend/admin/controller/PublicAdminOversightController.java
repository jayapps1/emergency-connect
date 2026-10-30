package com.gec.backend.admin.controller;

import com.gec.backend.admin.service.PublicAdminOversightService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/public-users")
@PreAuthorize("hasRole('ROLE_SYSTEM_ADMIN')")
public class PublicAdminOversightController {

    private final PublicAdminOversightService oversightService;

    public PublicAdminOversightController(PublicAdminOversightService oversightService) {
        this.oversightService = oversightService;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getPublicUserSummary() {
        return ResponseEntity.ok(oversightService.getPublicUserSummary());
    }

    @GetMapping
    public ResponseEntity<Page<Map<String, Object>>> getPublicUsers(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Boolean verified,
        @RequestParam(required = false) Boolean totp,
        @RequestParam(required = false) String search,
        Pageable pageable
    ) {
        return ResponseEntity.ok(oversightService.getPublicUsers(status, verified, totp, search, pageable));
    }

    @GetMapping("/guests")
    public ResponseEntity<Page<Map<String, Object>>> getGuestInstallations(Pageable pageable) {
        return ResponseEntity.ok(oversightService.getGuestInstallations(pageable));
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<Map<String, Object>> disablePublicUser(@PathVariable UUID id) {
        return ResponseEntity.ok(oversightService.disablePublicUser(id));
    }

    @PostMapping("/{id}/enable")
    public ResponseEntity<Map<String, Object>> enablePublicUser(@PathVariable UUID id) {
        return ResponseEntity.ok(oversightService.enablePublicUser(id));
    }

    @PostMapping("/{id}/revoke-sessions")
    public ResponseEntity<Map<String, Object>> revokePublicUserSessions(@PathVariable UUID id) {
        return ResponseEntity.ok(oversightService.revokePublicUserSessions(id));
    }
}
