package com.gec.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateBackupRequest(
    @NotBlank String backupType
) {}
