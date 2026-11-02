package com.gec.backend.report.dto;

import java.time.LocalDateTime;

public record PublicTrackingShareDetailResponseDto(
    String publicReference,
    String categoryName,
    String status,
    String shareMode,
    String trackingStatus,
    String agencyName,
    String stationName,
    String applianceCode,
    String responseLeadName,
    Double stationLatitude,
    Double stationLongitude,
    Double incidentLatitude,
    Double incidentLongitude,
    Double responseLatitude,
    Double responseLongitude,
    Double responseAccuracyMeters,
    LocalDateTime responseLastUpdatedAt
) {}
