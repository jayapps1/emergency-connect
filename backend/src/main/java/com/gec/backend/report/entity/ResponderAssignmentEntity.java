package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "responder_assignment")
public class ResponderAssignmentEntity {

    @Id
    private UUID id;

    @Column(name = "report_assignment_id", nullable = false)
    private UUID reportAssignmentId;

    @Column(name = "responder_user_id", nullable = false)
    private UUID responderUserId;

    @Column(name = "assigned_by_user_id", nullable = false)
    private UUID assignedByUserId;

    @Column(name = "note")
    private String note;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt = LocalDateTime.now();

    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public ResponderAssignmentEntity() {}

    public ResponderAssignmentEntity(UUID id, UUID reportAssignmentId, UUID responderUserId, UUID assignedByUserId, String note) {
        this.id = id;
        this.reportAssignmentId = reportAssignmentId;
        this.responderUserId = responderUserId;
        this.assignedByUserId = assignedByUserId;
        this.note = note;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportAssignmentId() { return reportAssignmentId; }
    public void setReportAssignmentId(UUID reportAssignmentId) { this.reportAssignmentId = reportAssignmentId; }
    public UUID getResponderUserId() { return responderUserId; }
    public void setResponderUserId(UUID responderUserId) { this.responderUserId = responderUserId; }
    public UUID getAssignedByUserId() { return assignedByUserId; }
    public void setAssignedByUserId(UUID assignedByUserId) { this.assignedByUserId = assignedByUserId; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }
    public LocalDateTime getReleasedAt() { return releasedAt; }
    public void setReleasedAt(LocalDateTime releasedAt) { this.releasedAt = releasedAt; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
