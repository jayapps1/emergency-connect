package com.gec.backend.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "backup_job")
public class BackupJobEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String reference;

    @Column(name = "backup_type", nullable = false, length = 30)
    private String backupType = "FULL";

    @Column(nullable = false, length = 50)
    private String status = "RUNNING";

    @Column(name = "local_path", length = 500)
    private String localPath;

    @Column(name = "total_bytes")
    private Long totalBytes = 0L;

    @Column(name = "checksum_sha256", length = 100)
    private String checksumSha256;

    @Column(name = "parent_reference", length = 50)
    private String parentReference;

    @Column(name = "chain_id", length = 100)
    private String chainId;

    @Column(name = "drive_file_id", length = 100)
    private String driveFileId;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public BackupJobEntity() {}

    public BackupJobEntity(UUID id, String reference, String backupType, UUID createdBy) {
        this.id = id;
        this.reference = reference;
        this.backupType = backupType;
        this.createdBy = createdBy;
        this.status = "RUNNING";
        this.startedAt = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getBackupType() { return backupType; }
    public void setBackupType(String backupType) { this.backupType = backupType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLocalPath() { return localPath; }
    public void setLocalPath(String localPath) { this.localPath = localPath; }
    public Long getTotalBytes() { return totalBytes; }
    public void setTotalBytes(Long totalBytes) { this.totalBytes = totalBytes; }
    public String getChecksumSha256() { return checksumSha256; }
    public void setChecksumSha256(String checksumSha256) { this.checksumSha256 = checksumSha256; }
    public String getParentReference() { return parentReference; }
    public void setParentReference(String parentReference) { this.parentReference = parentReference; }
    public String getChainId() { return chainId; }
    public void setChainId(String chainId) { this.chainId = chainId; }
    public String getDriveFileId() { return driveFileId; }
    public void setDriveFileId(String driveFileId) { this.driveFileId = driveFileId; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
