package com.gec.backend.station.dto;

import com.gec.backend.reference.entity.StationLevel;
import java.util.UUID;

public record StationResponse(
    UUID id,
    UUID agencyId,
    String name,
    String code,
    StationLevel stationLevel,
    String region,
    String district,
    UUID regionId,
    UUID districtId,
    String locality,
    Double latitude,
    Double longitude,
    Double locationAccuracyMeters,
    boolean active,
    boolean verified,
    StationAvailabilityDto availability
) {
    public StationResponse(
        UUID id,
        UUID agencyId,
        String name,
        String code,
        StationLevel stationLevel,
        String region,
        String district,
        UUID regionId,
        UUID districtId,
        String locality,
        Double latitude,
        Double longitude,
        Double locationAccuracyMeters,
        boolean active,
        boolean verified
    ) {
        this(id, agencyId, name, code, stationLevel, region, district, regionId, districtId, locality, latitude, longitude, locationAccuracyMeters, active, verified, null);
    }

    public record StationAvailabilityDto(
        boolean available,
        long availableCount,
        long atEmergencyCount,
        long outOfCommissionCount,
        long maintenanceCount,
        String primaryState,
        String updatedAt
    ) {}
}
