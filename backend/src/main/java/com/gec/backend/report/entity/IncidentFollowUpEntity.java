package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "incident_follow_up")
public class IncidentFollowUpEntity {

    @Id
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "report_assignment_id")
    private UUID reportAssignmentId;

    @Column(name = "citizen_user_id")
    private UUID citizenUserId;

    @Column(name = "installation_id")
    private UUID installationId;

    @Column(name = "agency_id", nullable = false)
    private UUID agencyId;

    @Column(name = "created_by_staff_user_id", nullable = false)
    private UUID createdByStaffUserId;

    @Column(name = "follow_up_type", nullable = false, length = 50)
    private String followUpType = "CALLBACK";

    @Column(nullable = false, length = 50)
    private String status = "PENDING";

    @Column(nullable = false, length = 1000)
    private String notes;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public IncidentFollowUpEntity() {}

    public IncidentFollowUpEntity(UUID id, UUID reportId, UUID agencyId, UUID createdByStaffUserId, String followUpType, String notes) {
        this.id = id;
        this.reportId = reportId;
        this.agencyId = agencyId;
        this.createdByStaffUserId = createdByStaffUserId;
        this.followUpType = followUpType;
        this.notes = notes;
        this.status = "PENDING";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public UUID getReportAssignmentId() { return reportAssignmentId; }
    public void setReportAssignmentId(UUID reportAssignmentId) { this.reportAssignmentId = reportAssignmentId; }
    public UUID getCitizenUserId() { return citizenUserId; }
    public void setCitizenUserId(UUID citizenUserId) { this.citizenUserId = citizenUserId; }
    public UUID getInstallationId() { return installationId; }
    public void setInstallationId(UUID installationId) { this.installationId = installationId; }
    public UUID getAgencyId() { return agencyId; }
    public void setAgencyId(UUID agencyId) { this.agencyId = agencyId; }
    public UUID getCreatedByStaffUserId() { return createdByStaffUserId; }
    public void setCreatedByStaffUserId(UUID createdByStaffUserId) { this.createdByStaffUserId = createdByStaffUserId; }
    public String getFollowUpType() { return followUpType; }
    public void setFollowUpType(String followUpType) { this.followUpType = followUpType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
