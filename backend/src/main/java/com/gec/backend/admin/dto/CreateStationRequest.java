package com.gec.backend.admin.dto;

import com.gec.backend.reference.entity.StationLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateStationRequest(
    @NotNull UUID agencyId,
    @NotBlank String name,
    @NotBlank String code,
    StationLevel stationLevel,
    String region,
    String district,
    UUID regionId,
    UUID districtId,
    String locality,
    @NotNull Double latitude,
    @NotNull Double longitude,
    Double locationAccuracyMeters,
    CreateStationContactRequest primaryContact
) {}
