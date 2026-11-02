package com.gec.backend.report.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ResponseTrackingSessionResponseDto(
    UUID sessionId,
    UUID reportAssignmentId,
    UUID assignedApplianceId,
    UUID responseLeadStaffUserId,
    String trackingSource,
    String status,
    LocalDateTime startedAt,
    LocalDateTime lastLocationAt,
    Double latestLatitude,
    Double latestLongitude,
    Double latestAccuracyMeters
) {}
