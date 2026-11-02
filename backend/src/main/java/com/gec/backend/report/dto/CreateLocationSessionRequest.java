package com.gec.backend.report.dto;

import com.gec.backend.report.entity.TrackingPolicy;
import java.time.LocalDateTime;
import java.util.UUID;

public record CreateLocationSessionRequest(
    UUID reportId,
    UUID callAttemptId,
    TrackingPolicy trackingPolicy,
    LocalDateTime consentGrantedAt
) {}
