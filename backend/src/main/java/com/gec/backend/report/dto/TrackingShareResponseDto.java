package com.gec.backend.report.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record TrackingShareResponseDto(
    UUID id,
    UUID reportId,
    String rawToken,
    String shareUrl,
    String shareMode,
    String status,
    LocalDateTime createdAt,
    LocalDateTime expiresAt,
    LocalDateTime revokedAt
) {}
