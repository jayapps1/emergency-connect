package com.gec.backend.admin.dto;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public record RoleDto(
    UUID id,
    String code,
    String name,
    String description,
    boolean systemRole,
    int permissionCount,
    Set<String> permissionCodes,
    LocalDateTime createdAt
) {}
