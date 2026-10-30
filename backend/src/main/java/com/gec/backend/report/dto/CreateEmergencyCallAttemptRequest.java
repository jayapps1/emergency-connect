package com.gec.backend.report.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateEmergencyCallAttemptRequest(
    @NotNull UUID agencyId,
    UUID stationId,
    UUID stationContactId,
    String destinationType,
    Double latitude,
    Double longitude,
    Double accuracyMeters,
    UUID clientGeneratedRequestId
) {}
