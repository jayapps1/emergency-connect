package com.gec.backend.admin.controller;

import com.gec.backend.admin.service.AdminReviewService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/reviews")
public class AdminReviewController {

    private final AdminReviewService reviewService;

    public AdminReviewController(AdminReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Page<Map<String, Object>>> getAdminReviews(
        @RequestParam(required = false) UUID stationId,
        @RequestParam(required = false) Short rating,
        Pageable pageable
    ) {
        return ResponseEntity.ok(reviewService.getAdminReviews(stationId, rating, pageable));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Map<String, Object>> getAdminReviewSummary() {
        return ResponseEntity.ok(reviewService.getAdminReviewSummary());
    }
}
