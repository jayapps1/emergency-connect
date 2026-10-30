package com.gec.backend.report.entity;

import com.gec.backend.agency.entity.AgencyType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_assignment")
public class ReportAssignmentEntity {

    @Id
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Enumerated(EnumType.STRING)
    @Column(name = "agency_type", nullable = false)
    private AgencyType agencyType;

    @Column(name = "agency_id")
    private UUID agencyId;

    @Column(name = "station_id")
    private UUID stationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status = ReportStatus.ASSIGNED;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt = LocalDateTime.now();

    @Column(name = "acknowledgement_sla_state")
    private String acknowledgementSlaState = "ON_TIME";

    @Column(name = "response_start_sla_state")
    private String responseStartSlaState = "ON_TIME";

    @Column(name = "last_escalated_at")
    private LocalDateTime lastEscalatedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public ReportAssignmentEntity() {}

    public ReportAssignmentEntity(UUID id, UUID reportId, AgencyType agencyType, ReportStatus status) {
        this.id = id;
        this.reportId = reportId;
        this.agencyType = agencyType;
        this.status = status;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public AgencyType getAgencyType() { return agencyType; }
    public void setAgencyType(AgencyType agencyType) { this.agencyType = agencyType; }
    public UUID getAgencyId() { return agencyId; }
    public void setAgencyId(UUID agencyId) { this.agencyId = agencyId; }
    public UUID getStationId() { return stationId; }
    public void setStationId(UUID stationId) { this.stationId = stationId; }
    public ReportStatus getStatus() { return status; }
    public void setStatus(ReportStatus status) { this.status = status; }
    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }
    public String getAcknowledgementSlaState() { return acknowledgementSlaState; }
    public void setAcknowledgementSlaState(String acknowledgementSlaState) { this.acknowledgementSlaState = acknowledgementSlaState; }
    public String getResponseStartSlaState() { return responseStartSlaState; }
    public void setResponseStartSlaState(String responseStartSlaState) { this.responseStartSlaState = responseStartSlaState; }
    public LocalDateTime getLastEscalatedAt() { return lastEscalatedAt; }
    public void setLastEscalatedAt(LocalDateTime lastEscalatedAt) { this.lastEscalatedAt = lastEscalatedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
