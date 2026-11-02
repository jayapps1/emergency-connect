package com.gec.backend.admin.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record UpdateRolePermissionsRequest(
    @NotNull Set<String> permissionCodes
) {}
