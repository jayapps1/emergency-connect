package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "response_invitation")
public class ResponseInvitationEntity {

    @Id
    private UUID id;

    @Column(name = "report_assignment_id", nullable = false)
    private UUID reportAssignmentId;

    @Column(name = "response_lead_staff_user_id", nullable = false)
    private UUID responseLeadStaffUserId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 100)
    private String tokenHash;

    @Column(nullable = false, length = 50)
    private String status = "PENDING";

    @Column(name = "created_by_staff_user_id", nullable = false)
    private UUID createdByStaffUserId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt = LocalDateTime.now().plusHours(24);

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public ResponseInvitationEntity() {}

    public ResponseInvitationEntity(UUID id, UUID reportAssignmentId, UUID responseLeadStaffUserId, String tokenHash, UUID createdByStaffUserId, LocalDateTime expiresAt) {
        this.id = id;
        this.reportAssignmentId = reportAssignmentId;
        this.responseLeadStaffUserId = responseLeadStaffUserId;
        this.tokenHash = tokenHash;
        this.createdByStaffUserId = createdByStaffUserId;
        this.expiresAt = expiresAt;
        this.status = "PENDING";
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportAssignmentId() { return reportAssignmentId; }
    public void setReportAssignmentId(UUID reportAssignmentId) { this.reportAssignmentId = reportAssignmentId; }
    public UUID getResponseLeadStaffUserId() { return responseLeadStaffUserId; }
    public void setResponseLeadStaffUserId(UUID responseLeadStaffUserId) { this.responseLeadStaffUserId = responseLeadStaffUserId; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public UUID getCreatedByStaffUserId() { return createdByStaffUserId; }
    public void setCreatedByStaffUserId(UUID createdByStaffUserId) { this.createdByStaffUserId = createdByStaffUserId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }
    public LocalDateTime getRevokedAt() { return revokedAt; }
    public void setRevokedAt(LocalDateTime revokedAt) { this.revokedAt = revokedAt; }
}
