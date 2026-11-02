package com.gec.backend.admin.dto;

import java.util.UUID;

public record PermissionDto(
    UUID id,
    String code,
    String name,
    String description,
    String category
) {}
