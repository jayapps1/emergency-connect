package com.gec.backend.safety.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Safety Information uses a typed request DTO so removed or optional
 * fields cannot cause unsafe Map lookups and null trimming.
 */
public record CreateSafetyInformationRequest(
    @NotBlank(message = "Title is required") String title,
    @NotBlank(message = "Full safety content is required") String content,
    String category,
    String severity,
    String status,
    Boolean notifyUsers,
    String summary
) {}
