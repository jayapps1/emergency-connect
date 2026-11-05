package com.gec.backend.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_management_request")
public class UserManagementRequestEntity {

    @Id
    private UUID id;

    @Column(name = "request_type", nullable = false)
    private String requestType = "DEACTIVATE";

    @Column(name = "target_user_id", nullable = false)
    private UUID targetUserId;

    @Column(name = "agency_id", nullable = false)
    private UUID agencyId;

    @Column(nullable = false)
    private String reason;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(nullable = false)
    private String status = "PENDING";

    @Column(name = "requested_by", nullable = false)
    private UUID requestedBy;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "agency_verified_by")
    private UUID agencyVerifiedBy;

    @Column(name = "agency_verified_at")
    private LocalDateTime agencyVerifiedAt;

    @Column(name = "agency_verification_method", length = 100)
    private String agencyVerificationMethod;

    @Column(name = "agency_verification_notes")
    private String agencyVerificationNotes;

    @Column(name = "collection_token")
    private String collectionToken;

    @Column(name = "collection_token_expires_at")
    private LocalDateTime collectionTokenExpiresAt;

    @Column(name = "collected_at")
    private LocalDateTime collectedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public UserManagementRequestEntity() {}

    public UserManagementRequestEntity(UUID id, String requestType, UUID targetUserId, UUID agencyId, String reason, LocalDate effectiveDate, UUID requestedBy) {
        this.id = id;
        this.requestType = requestType;
        this.targetUserId = targetUserId;
        this.agencyId = agencyId;
        this.reason = reason;
        this.effectiveDate = effectiveDate;
        this.requestedBy = requestedBy;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getRequestType() { return requestType; }
    public void setRequestType(String requestType) { this.requestType = requestType; }
    public UUID getTargetUserId() { return targetUserId; }
    public void setTargetUserId(UUID targetUserId) { this.targetUserId = targetUserId; }
    public UUID getAgencyId() { return agencyId; }
    public void setAgencyId(UUID agencyId) { this.agencyId = agencyId; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public UUID getRequestedBy() { return requestedBy; }
    public void setRequestedBy(UUID requestedBy) { this.requestedBy = requestedBy; }
    public UUID getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(UUID reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
    public UUID getAgencyVerifiedBy() { return agencyVerifiedBy; }
    public void setAgencyVerifiedBy(UUID agencyVerifiedBy) { this.agencyVerifiedBy = agencyVerifiedBy; }
    public LocalDateTime getAgencyVerifiedAt() { return agencyVerifiedAt; }
    public void setAgencyVerifiedAt(LocalDateTime agencyVerifiedAt) { this.agencyVerifiedAt = agencyVerifiedAt; }
    public String getAgencyVerificationMethod() { return agencyVerificationMethod; }
    public void setAgencyVerificationMethod(String agencyVerificationMethod) { this.agencyVerificationMethod = agencyVerificationMethod; }
    public String getAgencyVerificationNotes() { return agencyVerificationNotes; }
    public void setAgencyVerificationNotes(String agencyVerificationNotes) { this.agencyVerificationNotes = agencyVerificationNotes; }
    public String getCollectionToken() { return collectionToken; }
    public void setCollectionToken(String collectionToken) { this.collectionToken = collectionToken; }
    public LocalDateTime getCollectionTokenExpiresAt() { return collectionTokenExpiresAt; }
    public void setCollectionTokenExpiresAt(LocalDateTime collectionTokenExpiresAt) { this.collectionTokenExpiresAt = collectionTokenExpiresAt; }
    public LocalDateTime getCollectedAt() { return collectedAt; }
    public void setCollectedAt(LocalDateTime collectedAt) { this.collectedAt = collectedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
