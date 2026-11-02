package com.gec.backend.admin.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record BackupScheduleDto(
    UUID id,
    String name,
    String backupType,
    boolean enabled,
    String cronExpression,
    String timezone,
    boolean cloudSyncEnabled,
    LocalDateTime lastRunAt,
    LocalDateTime nextRunAt,
    UUID createdBy
) {}
