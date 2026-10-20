package com.gec.backend.abuse.controller;

import com.gec.backend.abuse.entity.ReportRiskAssessmentEntity;
import com.gec.backend.abuse.service.ReportRiskEvaluationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/report-risk")
public class AdminReportRiskController {

    private final ReportRiskEvaluationService riskService;

    public AdminReportRiskController(ReportRiskEvaluationService riskService) {
        this.riskService = riskService;
    }

    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<Page<ReportRiskAssessmentEntity>> getRiskAssessments(
        @RequestParam(value = "reviewStatus", required = false) String reviewStatus,
        Pageable pageable
    ) {
        return ResponseEntity.ok(riskService.getRiskAssessments(reviewStatus, pageable));
    }

    @PostMapping("/{reportId}/review")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<ReportRiskAssessmentEntity> reviewRiskAssessment(
        @PathVariable UUID reportId,
        @RequestBody Map<String, String> body
    ) {
        String decision = body.get("decision");
        String note = body.get("note");
        return ResponseEntity.ok(riskService.reviewRiskAssessment(reportId, decision, note));
    }
}
