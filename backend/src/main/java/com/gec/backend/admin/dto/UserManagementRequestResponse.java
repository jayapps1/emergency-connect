package com.gec.backend.admin.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record UserManagementRequestResponse(
    UUID id,
    String requestType,
    UUID targetUserId,
    String targetUserEmail,
    String requestedEmail,
    String targetUserName,
    UUID agencyId,
    String agencyName,
    String reason,
    LocalDate effectiveDate,
    String status,
    UUID requestedBy,
    UUID reviewedBy,
    LocalDateTime reviewedAt,
    String rejectionReason,
    LocalDateTime createdAt
) {
    public UserManagementRequestResponse(
        UUID id,
        String requestType,
        UUID targetUserId,
        String targetUserEmail,
        String targetUserName,
        UUID agencyId,
        String agencyName,
        String reason,
        LocalDate effectiveDate,
        String status,
        UUID requestedBy,
        UUID reviewedBy,
        LocalDateTime reviewedAt,
        String rejectionReason,
        LocalDateTime createdAt
    ) {
        this(id, requestType, targetUserId, targetUserEmail, null, targetUserName, agencyId, agencyName, reason, effectiveDate, status, requestedBy, reviewedBy, reviewedAt, rejectionReason, createdAt);
    }
}
