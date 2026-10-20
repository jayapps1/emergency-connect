package com.gec.backend.abuse.service;

import com.gec.backend.abuse.entity.ReportRiskAssessmentEntity;
import com.gec.backend.abuse.repository.ReportRiskAssessmentRepository;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.report.entity.IncidentReportEntity;
import com.gec.backend.report.repository.IncidentReportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Deterministic risk evaluation service for detecting potential prank or duplicate emergency reports.
 *
 * <p>Core Safety Constraint:
 * Risk assessment is strictly informational and advisory. An emergency report is NEVER blocked or discarded.
 * High-risk reports are saved and routed to dispatchers as normal, carrying a risk flag for human review.
 */
@Service
public class ReportRiskEvaluationService {

    private static final Logger log = LoggerFactory.getLogger(ReportRiskEvaluationService.class);

    private final ReportRiskAssessmentRepository riskRepository;
    private final IncidentReportRepository reportRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    @Value("${app.abuse.report.soft-limit:5}")
    private int softSubmissionLimit;

    @Value("${app.abuse.report.high-limit:10}")
    private int highSubmissionLimit;

    public ReportRiskEvaluationService(
        ReportRiskAssessmentRepository riskRepository,
        IncidentReportRepository reportRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.riskRepository = riskRepository;
        this.reportRepository = reportRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    @Transactional
    public ReportRiskAssessmentEntity evaluateReportRisk(IncidentReportEntity report) {
        List<String> signals = new ArrayList<>();
        int score = 0;

        if (report.getLatitude() != null && report.getLongitude() != null) {
            double lat = report.getLatitude();
            double lon = report.getLongitude();
            if (lat < 4.5 || lat > 11.5 || lon < -3.5 || lon > 1.5) {
                signals.add("LOCATION_OUTSIDE_OPERATIONAL_AREA");
                score += 30;
            }
        }

        if (report.getReporterPublicUserId() != null) {
            List<IncidentReportEntity> userRecent = reportRepository.findByReporterPublicUserIdOrderByCreatedAtDesc(report.getReporterPublicUserId());
            long recentCount = userRecent.stream()
                .filter(r -> r.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(10)))
                .count();

            if (recentCount >= highSubmissionLimit) {
                signals.add("RAPID_SUBMISSIONS_HIGH");
                score += 50;
            } else if (recentCount >= softSubmissionLimit) {
                signals.add("RAPID_SUBMISSIONS_ELEVATED");
                score += 25;
            }
        }

        String riskLevel;
        if (score >= 50) {
            riskLevel = "HIGH";
        } else if (score >= 25) {
            riskLevel = "ELEVATED";
        } else {
            riskLevel = "NORMAL";
        }

        String signalsJson = "[\"" + String.join("\",\"", signals) + "\"]";
        ReportRiskAssessmentEntity assessment = new ReportRiskAssessmentEntity(
            UUID.randomUUID(),
            report.getId(),
            riskLevel,
            score,
            signalsJson
        );

        log.info("Report {} risk evaluated: level={}, score={}", report.getPublicReference(), riskLevel, score);
        return riskRepository.save(assessment);
    }

    public Page<ReportRiskAssessmentEntity> getRiskAssessments(String reviewStatus, Pageable pageable) {
        if (!scopeService.isSystemAdmin()) {
            throw new IllegalArgumentException("Only System Administrators can access security risk assessment reviews.");
        }
        if (reviewStatus != null && !reviewStatus.isBlank()) {
            return riskRepository.findByReviewStatus(reviewStatus.trim().toUpperCase(), pageable);
        }
        return riskRepository.findAll(pageable);
    }

    @Transactional
    public ReportRiskAssessmentEntity reviewRiskAssessment(UUID reportId, String decision, String note) {
        if (!scopeService.isSystemAdmin()) {
            throw new IllegalArgumentException("Only System Administrators can review report risk assessments.");
        }

        ReportRiskAssessmentEntity assessment = riskRepository.findByReportId(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Risk assessment not found for report: " + reportId));

        String validDecision = decision != null ? decision.trim().toUpperCase() : "CONFIRMED_VALID";
        assessment.setReviewStatus(validDecision);
        assessment.setReviewedBy(scopeService.getCurrentPrincipal().getId());
        assessment.setReviewedAt(LocalDateTime.now());
        assessment.setReviewNote(note);

        auditService.logAction(
            scopeService.getCurrentPrincipal().getId(),
            "RISK_REVIEW_" + validDecision,
            "REPORT_RISK",
            assessment.getId(),
            null,
            "Reviewed risk decision to " + validDecision + " for report " + reportId,
            null,
            null
        );

        return riskRepository.save(assessment);
    }
}
