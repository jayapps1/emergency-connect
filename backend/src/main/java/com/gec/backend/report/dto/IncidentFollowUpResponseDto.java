package com.gec.backend.report.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record IncidentFollowUpResponseDto(
    UUID id,
    UUID reportId,
    UUID agencyId,
    UUID createdByStaffUserId,
    String followUpType,
    String status,
    String notes,
    LocalDateTime scheduledAt,
    LocalDateTime completedAt,
    LocalDateTime createdAt
) {}
