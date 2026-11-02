package com.gec.backend.report.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record LiveTrackingRequestResponseDto(
    UUID id,
    UUID reportId,
    UUID requestedByStaffId,
    UUID requestedByAgencyId,
    String reason,
    String status,
    LocalDateTime requestedAt,
    LocalDateTime expiresAt,
    LocalDateTime respondedAt
) {}
