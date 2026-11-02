package com.gec.backend.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "backup_cloud_sync_queue")
public class BackupCloudSyncEntity {

    @Id
    private UUID id;

    @Column(name = "backup_id", nullable = false)
    private UUID backupId;

    @Column(name = "destination_folder_id", nullable = false, length = 100)
    private String destinationFolderId = "1H1PXcLzevcjRs02nqOlX3CNgedE3hswY";

    @Column(nullable = false, length = 50)
    private String status = "PENDING";

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt;

    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "remote_file_id", length = 100)
    private String remoteFileId;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public BackupCloudSyncEntity() {}

    public BackupCloudSyncEntity(UUID id, UUID backupId, String destinationFolderId) {
        this.id = id;
        this.backupId = backupId;
        this.destinationFolderId = destinationFolderId != null ? destinationFolderId : "1H1PXcLzevcjRs02nqOlX3CNgedE3hswY";
        this.status = "PENDING";
        this.attemptCount = 0;
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getBackupId() { return backupId; }
    public void setBackupId(UUID backupId) { this.backupId = backupId; }
    public String getDestinationFolderId() { return destinationFolderId; }
    public void setDestinationFolderId(String destinationFolderId) { this.destinationFolderId = destinationFolderId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }
    public LocalDateTime getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(LocalDateTime nextAttemptAt) { this.nextAttemptAt = nextAttemptAt; }
    public LocalDateTime getLastAttemptAt() { return lastAttemptAt; }
    public void setLastAttemptAt(LocalDateTime lastAttemptAt) { this.lastAttemptAt = lastAttemptAt; }
    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
    public String getRemoteFileId() { return remoteFileId; }
    public void setRemoteFileId(String remoteFileId) { this.remoteFileId = remoteFileId; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
