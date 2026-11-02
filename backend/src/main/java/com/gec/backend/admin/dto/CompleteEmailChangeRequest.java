package com.gec.backend.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CompleteEmailChangeRequest(
    @NotBlank String currentPassword,
    @Email String newEmail
) {
    public CompleteEmailChangeRequest(String currentPassword) {
        this(currentPassword, null);
    }
}
