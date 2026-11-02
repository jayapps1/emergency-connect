package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "response_tracking_session")
public class ResponseTrackingSessionEntity {

    @Id
    private UUID id;

    @Column(name = "report_assignment_id", nullable = false)
    private UUID reportAssignmentId;

    @Column(name = "assigned_appliance_id")
    private UUID assignedApplianceId;

    @Column(name = "response_lead_staff_user_id", nullable = false)
    private UUID responseLeadStaffUserId;

    @Column(name = "tracking_source", nullable = false, length = 50)
    private String trackingSource = "RESPONSE_LEAD_DEVICE";

    @Column(nullable = false, length = 50)
    private String status = "ACTIVE";

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "end_reason", length = 100)
    private String endReason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public ResponseTrackingSessionEntity() {}

    public ResponseTrackingSessionEntity(UUID id, UUID reportAssignmentId, UUID assignedApplianceId, UUID responseLeadStaffUserId) {
        this.id = id;
        this.reportAssignmentId = reportAssignmentId;
        this.assignedApplianceId = assignedApplianceId;
        this.responseLeadStaffUserId = responseLeadStaffUserId;
        this.trackingSource = "RESPONSE_LEAD_DEVICE";
        this.status = "ACTIVE";
        this.startedAt = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportAssignmentId() { return reportAssignmentId; }
    public void setReportAssignmentId(UUID reportAssignmentId) { this.reportAssignmentId = reportAssignmentId; }
    public UUID getAssignedApplianceId() { return assignedApplianceId; }
    public void setAssignedApplianceId(UUID assignedApplianceId) { this.assignedApplianceId = assignedApplianceId; }
    public UUID getResponseLeadStaffUserId() { return responseLeadStaffUserId; }
    public void setResponseLeadStaffUserId(UUID responseLeadStaffUserId) { this.responseLeadStaffUserId = responseLeadStaffUserId; }
    public String getTrackingSource() { return trackingSource; }
    public void setTrackingSource(String trackingSource) { this.trackingSource = trackingSource; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getLastLocationAt() { return lastLocationAt; }
    public void setLastLocationAt(LocalDateTime lastLocationAt) { this.lastLocationAt = lastLocationAt; }
    public LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }
    public String getEndReason() { return endReason; }
    public void setEndReason(String endReason) { this.endReason = endReason; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
