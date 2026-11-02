package com.gec.backend.admin.controller;

import com.gec.backend.report.dto.CreateCategoryRequest;
import com.gec.backend.report.dto.IncidentCategoryResponse;
import com.gec.backend.report.dto.UpdateCategoryRequest;
import com.gec.backend.report.entity.TrackingPolicy;
import com.gec.backend.report.service.IncidentCategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/incident-categories")
public class AdminIncidentCategoryController {

    private final IncidentCategoryService categoryService;

    public AdminIncidentCategoryController(IncidentCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('INCIDENT_CATEGORY_READ') or hasAuthority('REPORT_READ')")
    public ResponseEntity<List<IncidentCategoryResponse>> getCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('INCIDENT_CATEGORY_READ') or hasAuthority('REPORT_READ')")
    public ResponseEntity<IncidentCategoryResponse> getCategoryById(@PathVariable UUID id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('INCIDENT_CATEGORY_MANAGE')")
    public ResponseEntity<IncidentCategoryResponse> createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.createCategory(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('INCIDENT_CATEGORY_MANAGE')")
    public ResponseEntity<IncidentCategoryResponse> updateCategory(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateCategoryRequest request
    ) {
        return ResponseEntity.ok(categoryService.updateCategory(id, request));
    }

    @PutMapping("/{id}/tracking-policy")
    @PreAuthorize("hasAuthority('INCIDENT_CATEGORY_MANAGE')")
    public ResponseEntity<IncidentCategoryResponse> updateCategoryTrackingPolicy(
        @PathVariable UUID id,
        @RequestParam TrackingPolicy trackingPolicy
    ) {
        return ResponseEntity.ok(categoryService.updateCategoryTrackingPolicy(id, trackingPolicy));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('INCIDENT_CATEGORY_MANAGE')")
    public ResponseEntity<IncidentCategoryResponse> toggleCategoryStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(categoryService.toggleCategoryStatus(id));
    }
}
