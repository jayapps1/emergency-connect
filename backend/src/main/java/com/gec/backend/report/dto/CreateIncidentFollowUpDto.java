package com.gec.backend.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

public record CreateIncidentFollowUpDto(
    @NotNull UUID reportId,
    @NotBlank String followUpType,
    @NotBlank String notes,
    LocalDateTime scheduledAt
) {}
