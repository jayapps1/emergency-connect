package com.gec.backend.appliance.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "response_appliance_status_history")
public class ResponseApplianceStatusHistoryEntity {

    @Id
    private UUID id;

    @Column(name = "appliance_id", nullable = false)
    private UUID applianceId;

    @Column(name = "previous_status")
    private String previousStatus;

    @Column(name = "new_status", nullable = false)
    private String newStatus;

    private String reason;

    @Column(name = "incident_id")
    private UUID incidentId;

    @Column(name = "changed_by")
    private UUID changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    public ResponseApplianceStatusHistoryEntity() {}

    public ResponseApplianceStatusHistoryEntity(
        UUID id,
        UUID applianceId,
        String previousStatus,
        String newStatus,
        String reason,
        UUID incidentId,
        UUID changedBy
    ) {
        this.id = id;
        this.applianceId = applianceId;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.reason = reason;
        this.incidentId = incidentId;
        this.changedBy = changedBy;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getApplianceId() { return applianceId; }
    public void setApplianceId(UUID applianceId) { this.applianceId = applianceId; }
    public String getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(String previousStatus) { this.previousStatus = previousStatus; }
    public String getNewStatus() { return newStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public UUID getIncidentId() { return incidentId; }
    public void setIncidentId(UUID incidentId) { this.incidentId = incidentId; }
    public UUID getChangedBy() { return changedBy; }
    public void setChangedBy(UUID changedBy) { this.changedBy = changedBy; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
