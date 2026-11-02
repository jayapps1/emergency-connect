package com.gec.backend.report.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ResponseInvitationResponseDto(
    UUID id,
    UUID reportAssignmentId,
    UUID responseLeadStaffUserId,
    String rawToken,
    String responseShareUrl,
    String status,
    LocalDateTime createdAt,
    LocalDateTime expiresAt,
    LocalDateTime acceptedAt
) {}
