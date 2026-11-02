package com.gec.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateScheduleRequest(
    @NotBlank String name,
    @NotBlank String backupType,
    @NotBlank String cronExpression,
    Boolean cloudSyncEnabled
) {}
