package com.gec.backend.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record StaffEmailChangeRequestDto(
    @NotBlank @Email String requestedEmail,
    @NotBlank String reason
) {}
