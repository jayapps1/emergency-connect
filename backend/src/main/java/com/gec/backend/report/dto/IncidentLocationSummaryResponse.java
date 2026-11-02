package com.gec.backend.report.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record IncidentLocationSummaryResponse(
    UUID reportId,
    String publicReference,
    Double initialLatitude,
    Double initialLongitude,
    Double initialAccuracyMeters,
    LocalDateTime initialCapturedAt,
    boolean isLiveTrackingActive,
    Double latestLiveLatitude,
    Double latestLiveLongitude,
    Double latestLiveAccuracyMeters,
    LocalDateTime latestLiveCapturedAt,
    List<StationOriginDto> stationOrigins
) {
    public record StationOriginDto(
        UUID agencyId,
        String agencyName,
        UUID stationId,
        String stationName,
        Double latitude,
        Double longitude
    ) {}
}
