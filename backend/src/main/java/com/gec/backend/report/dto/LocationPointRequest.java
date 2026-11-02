package com.gec.backend.report.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record LocationPointRequest(
    @NotNull Double latitude,
    @NotNull Double longitude,
    Double accuracyMeters,
    LocalDateTime capturedAt
) {}
