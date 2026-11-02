package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "incident_location_session")
public class IncidentLocationSessionEntity {

    @Id
    private UUID id;

    @Column(name = "report_id")
    private UUID reportId;

    @Column(name = "call_attempt_id")
    private UUID callAttemptId;

    @Column(name = "public_user_id")
    private UUID publicUserId;

    @Column(name = "installation_public_id", length = 100)
    private String installationPublicId;

    @Column(nullable = false, length = 50)
    private String status = "ACTIVE";

    @Enumerated(EnumType.STRING)
    @Column(name = "tracking_policy", nullable = false)
    private TrackingPolicy trackingPolicy = TrackingPolicy.LIVE_OPTIONAL;

    @Column(name = "consent_granted_at", nullable = false)
    private LocalDateTime consentGrantedAt = LocalDateTime.now();

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public IncidentLocationSessionEntity() {}

    public IncidentLocationSessionEntity(UUID id, UUID reportId, UUID callAttemptId, TrackingPolicy trackingPolicy) {
        this.id = id;
        this.reportId = reportId;
        this.callAttemptId = callAttemptId;
        this.trackingPolicy = trackingPolicy;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public UUID getCallAttemptId() { return callAttemptId; }
    public void setCallAttemptId(UUID callAttemptId) { this.callAttemptId = callAttemptId; }
    public UUID getPublicUserId() { return publicUserId; }
    public void setPublicUserId(UUID publicUserId) { this.publicUserId = publicUserId; }
    public String getInstallationPublicId() { return installationPublicId; }
    public void setInstallationPublicId(String installationPublicId) { this.installationPublicId = installationPublicId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public TrackingPolicy getTrackingPolicy() { return trackingPolicy; }
    public void setTrackingPolicy(TrackingPolicy trackingPolicy) { this.trackingPolicy = trackingPolicy; }
    public LocalDateTime getConsentGrantedAt() { return consentGrantedAt; }
    public void setConsentGrantedAt(LocalDateTime consentGrantedAt) { this.consentGrantedAt = consentGrantedAt; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getLastLocationAt() { return lastLocationAt; }
    public void setLastLocationAt(LocalDateTime lastLocationAt) { this.lastLocationAt = lastLocationAt; }
    public LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
