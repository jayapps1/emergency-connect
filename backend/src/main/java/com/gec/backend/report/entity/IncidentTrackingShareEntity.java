package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "incident_tracking_share")
public class IncidentTrackingShareEntity {

    @Id
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "location_session_id")
    private UUID locationSessionId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 100)
    private String tokenHash;

    @Column(name = "share_mode", nullable = false, length = 50)
    private String shareMode = "SNAPSHOT";

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(nullable = false, length = 50)
    private String status = "ACTIVE";

    public IncidentTrackingShareEntity() {}

    public IncidentTrackingShareEntity(UUID id, UUID reportId, String tokenHash, String shareMode, UUID createdBy, LocalDateTime expiresAt) {
        this.id = id;
        this.reportId = reportId;
        this.tokenHash = tokenHash;
        this.shareMode = shareMode;
        this.createdBy = createdBy;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
        this.status = "ACTIVE";
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public UUID getLocationSessionId() { return locationSessionId; }
    public void setLocationSessionId(UUID locationSessionId) { this.locationSessionId = locationSessionId; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public String getShareMode() { return shareMode; }
    public void setShareMode(String shareMode) { this.shareMode = shareMode; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getRevokedAt() { return revokedAt; }
    public void setRevokedAt(LocalDateTime revokedAt) { this.revokedAt = revokedAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
