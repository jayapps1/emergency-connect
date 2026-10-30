package com.gec.backend.report.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record EmergencyCallAttemptResponse(
    UUID id,
    String publicReference,
    UUID agencyId,
    UUID stationId,
    String destinationType,
    String destinationPhone,
    Double latitude,
    Double longitude,
    Double accuracyMeters,
    String status,
    LocalDateTime initiatedAt,
    LocalDateTime callLaunchedAt,
    UUID linkedReportId,
    LocalDateTime createdAt
) {}
