package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "live_tracking_request")
public class LiveTrackingRequestEntity {

    @Id
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "requested_by_staff_id", nullable = false)
    private UUID requestedByStaffId;

    @Column(name = "requested_by_agency_id", nullable = false)
    private UUID requestedByAgencyId;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false, length = 50)
    private String status = "PENDING";

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(15);

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public LiveTrackingRequestEntity() {}

    public LiveTrackingRequestEntity(UUID id, UUID reportId, UUID requestedByStaffId, UUID requestedByAgencyId, String reason) {
        this.id = id;
        this.reportId = reportId;
        this.requestedByStaffId = requestedByStaffId;
        this.requestedByAgencyId = requestedByAgencyId;
        this.reason = reason;
        this.status = "PENDING";
        this.requestedAt = LocalDateTime.now();
        this.expiresAt = LocalDateTime.now().plusMinutes(15);
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public UUID getRequestedByStaffId() { return requestedByStaffId; }
    public void setRequestedByStaffId(UUID requestedByStaffId) { this.requestedByStaffId = requestedByStaffId; }
    public UUID getRequestedByAgencyId() { return requestedByAgencyId; }
    public void setRequestedByAgencyId(UUID requestedByAgencyId) { this.requestedByAgencyId = requestedByAgencyId; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getRespondedAt() { return respondedAt; }
    public void setRespondedAt(LocalDateTime respondedAt) { this.respondedAt = respondedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
