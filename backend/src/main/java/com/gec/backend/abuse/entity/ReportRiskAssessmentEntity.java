package com.gec.backend.abuse.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_risk_assessment")
public class ReportRiskAssessmentEntity {

    @Id
    private UUID id;

    @Column(name = "report_id", nullable = false, unique = true)
    private UUID reportId;

    @Column(name = "risk_level", nullable = false)
    private String riskLevel = "NORMAL"; // "NORMAL", "ELEVATED", "HIGH"

    @Column(name = "risk_score")
    private Integer riskScore;

    @Column(columnDefinition = "TEXT")
    private String signals; // JSON string array e.g. ["RAPID_SUBMISSIONS", "LOCATION_OUTSIDE_OPERATIONAL_AREA"]

    @Column(name = "review_status", nullable = false)
    private String reviewStatus = "UNREVIEWED"; // "UNREVIEWED", "CONFIRMED_VALID", "CONFIRMED_ABUSE", "FALSE_POSITIVE"

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public ReportRiskAssessmentEntity() {}

    public ReportRiskAssessmentEntity(UUID id, UUID reportId, String riskLevel, Integer riskScore, String signals) {
        this.id = id;
        this.reportId = reportId;
        this.riskLevel = riskLevel;
        this.riskScore = riskScore;
        this.signals = signals;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public Integer getRiskScore() { return riskScore; }
    public void setRiskScore(Integer riskScore) { this.riskScore = riskScore; }
    public String getSignals() { return signals; }
    public void setSignals(String signals) { this.signals = signals; }
    public String getReviewStatus() { return reviewStatus; }
    public void setReviewStatus(String reviewStatus) { this.reviewStatus = reviewStatus; }
    public UUID getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(UUID reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public String getReviewNote() { return reviewNote; }
    public void setReviewNote(String reviewNote) { this.reviewNote = reviewNote; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
