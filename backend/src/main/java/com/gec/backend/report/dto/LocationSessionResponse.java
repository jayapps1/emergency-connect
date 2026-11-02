package com.gec.backend.report.dto;

import com.gec.backend.report.entity.TrackingPolicy;
import java.time.LocalDateTime;
import java.util.UUID;

public record LocationSessionResponse(
    UUID sessionId,
    UUID reportId,
    UUID callAttemptId,
    String status,
    TrackingPolicy trackingPolicy,
    LocalDateTime consentGrantedAt,
    LocalDateTime startedAt,
    LocalDateTime lastLocationAt,
    LocalDateTime endedAt
) {}
