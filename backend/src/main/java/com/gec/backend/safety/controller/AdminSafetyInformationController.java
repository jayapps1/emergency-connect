package com.gec.backend.safety.controller;

import com.gec.backend.safety.dto.CreateSafetyInformationRequest;
import com.gec.backend.safety.service.SafetyInformationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/safety-information")
public class AdminSafetyInformationController {

    private final SafetyInformationService safetyService;

    public AdminSafetyInformationController(SafetyInformationService safetyService) {
        this.safetyService = safetyService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Map<String, Object>> getAdminSummary() {
        return ResponseEntity.ok(safetyService.getAdminSummary());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Page<Map<String, Object>>> getAdminPosts(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String severity,
        @RequestParam(required = false) UUID agencyId,
        @RequestParam(required = false) String search,
        Pageable pageable
    ) {
        return ResponseEntity.ok(safetyService.getAdminPosts(status, category, severity, agencyId, search, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Map<String, Object>> createPost(@Valid @RequestBody CreateSafetyInformationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(safetyService.createPost(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Map<String, Object>> updatePost(@PathVariable UUID id, @Valid @RequestBody CreateSafetyInformationRequest request) {
        return ResponseEntity.ok(safetyService.updatePost(id, request));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Map<String, Object>> publishPost(@PathVariable UUID id) {
        return ResponseEntity.ok(safetyService.publishPost(id));
    }

    @PostMapping("/{id}/unpublish")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Map<String, Object>> unpublishPost(@PathVariable UUID id) {
        return ResponseEntity.ok(safetyService.unpublishPost(id));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Map<String, Object>> archivePost(@PathVariable UUID id) {
        return ResponseEntity.ok(safetyService.archivePost(id));
    }

    @PostMapping("/{id}/remove")
    @PreAuthorize("hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, Object>> removePostBySystem(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String reason = body != null ? body.get("removalReason") : null;
        return ResponseEntity.ok(safetyService.removePostBySystem(id, reason));
    }
}
