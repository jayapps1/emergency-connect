package com.gec.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Set;
import java.util.UUID;

public record UpdateAdminUserRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    String phoneNumber,
    UUID agencyId,
    String region,
    UUID stationId,
    Integer priorityLevel,
    Set<String> roleCodes
) {
    public UpdateAdminUserRequest(
        String firstName,
        String lastName,
        String phoneNumber,
        UUID agencyId,
        String region,
        UUID stationId,
        Set<String> roleCodes
    ) {
        this(firstName, lastName, phoneNumber, agencyId, region, stationId, null, roleCodes);
    }
}
