package com.gec.backend.admin.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record BackupJobDto(
    UUID id,
    String reference,
    String backupType,
    String status,
    String localStatus,
    String cloudStatus,
    String localPath,
    Long totalBytes,
    String checksumSha256,
    String parentReference,
    String chainId,
    String driveFileId,
    String errorMessage,
    LocalDateTime startedAt,
    LocalDateTime completedAt,
    UUID createdBy
) {
    public BackupJobDto(
        UUID id,
        String reference,
        String backupType,
        String status,
        String localPath,
        Long totalBytes,
        String checksumSha256,
        String parentReference,
        String chainId,
        String driveFileId,
        String errorMessage,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        UUID createdBy
    ) {
        this(id, reference, backupType, status,
            "FAILED".equals(status) ? "FAILED" : "VERIFIED",
            driveFileId != null ? "SYNCED" : "PENDING_SYNC",
            localPath, totalBytes, checksumSha256, parentReference, chainId, driveFileId, errorMessage, startedAt, completedAt, createdBy);
    }
}
