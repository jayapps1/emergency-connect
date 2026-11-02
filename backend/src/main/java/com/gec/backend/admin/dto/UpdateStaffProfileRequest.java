package com.gec.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateStaffProfileRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    String phoneNumber
) {}
