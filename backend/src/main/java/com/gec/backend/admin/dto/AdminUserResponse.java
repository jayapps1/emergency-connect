package com.gec.backend.admin.dto;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public record AdminUserResponse(
    UUID id,
    String email,
    String firstName,
    String lastName,
    String phoneNumber,
    UUID agencyId,
    String agencyName,
    String region,
    UUID stationId,
    String stationName,
    Integer priorityLevel,
    boolean active,
    boolean locked,
    boolean mustChangePassword,
    boolean totpEnabled,
    LocalDateTime lastLoginAt,
    Set<String> roles
) {
    public AdminUserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String phoneNumber,
        UUID agencyId,
        String agencyName,
        String region,
        UUID stationId,
        String stationName,
        boolean active,
        boolean locked,
        boolean mustChangePassword,
        boolean totpEnabled,
        LocalDateTime lastLoginAt,
        Set<String> roles
    ) {
        this(id, email, firstName, lastName, phoneNumber, agencyId, agencyName, region, stationId, stationName, null, active, locked, mustChangePassword, totpEnabled, lastLoginAt, roles);
    }
}
