package com.gec.backend.admin.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record CentralizedRequestItemDto(
    UUID id,
    String requestRef,
    String requestType, // 'AGENCY_ADMIN_ACCESS' or 'EMAIL_CHANGE' or 'DEACTIVATE'
    String requestedByName,
    String targetUserName,
    String role,
    String agencyName,
    String currentEmail,
    String requestedEmail,
    String reason,
    String status,
    LocalDateTime requestedAt
) {}
