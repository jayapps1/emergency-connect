package com.gec.backend.report.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateLiveTrackingRequestDto(
    @NotNull UUID reportId,
    String reason
) {}
