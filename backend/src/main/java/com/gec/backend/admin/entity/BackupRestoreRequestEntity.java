package com.gec.backend.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "backup_restore_request")
public class BackupRestoreRequestEntity {

    @Id
    private UUID id;

    @Column(name = "backup_id", nullable = false)
    private UUID backupId;

    @Column(nullable = false, length = 50)
    private String status = "REQUESTED";

    @Column(name = "requested_by", nullable = false)
    private UUID requestedBy;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(length = 1000)
    private String notes;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public BackupRestoreRequestEntity() {}

    public BackupRestoreRequestEntity(UUID id, UUID backupId, UUID requestedBy, String notes) {
        this.id = id;
        this.backupId = backupId;
        this.requestedBy = requestedBy;
        this.notes = notes;
        this.status = "REQUESTED";
        this.requestedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getBackupId() { return backupId; }
    public void setBackupId(UUID backupId) { this.backupId = backupId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public UUID getRequestedBy() { return requestedBy; }
    public void setRequestedBy(UUID requestedBy) { this.requestedBy = requestedBy; }
    public UUID getApprovedBy() { return approvedBy; }
    public void setApprovedBy(UUID approvedBy) { this.approvedBy = approvedBy; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
