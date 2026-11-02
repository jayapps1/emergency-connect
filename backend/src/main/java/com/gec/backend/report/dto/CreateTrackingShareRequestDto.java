package com.gec.backend.report.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateTrackingShareRequestDto(
    @NotNull UUID reportId,
    String shareMode,
    Integer durationMinutes
) {}
