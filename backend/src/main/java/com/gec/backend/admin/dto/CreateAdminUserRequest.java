package com.gec.backend.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Set;
import java.util.UUID;

public record CreateAdminUserRequest(
    @NotBlank @Email String email,
    @NotBlank String firstName,
    @NotBlank String lastName,
    String phoneNumber,
    UUID agencyId,
    String region,
    UUID stationId,
    Integer priorityLevel,
    Set<String> roleCodes
) {
    public CreateAdminUserRequest(
        String email,
        String firstName,
        String lastName,
        String phoneNumber,
        UUID agencyId,
        String region,
        UUID stationId,
        Set<String> roleCodes
    ) {
        this(email, firstName, lastName, phoneNumber, agencyId, region, stationId, 2, roleCodes);
    }
}
