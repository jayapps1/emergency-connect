package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.*;
import com.gec.backend.admin.repository.*;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.common.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Updates role-permission mappings transactionally so authorization changes
 * remain consistent across staff accounts using the role.
 */
@Service
public class AdminRoleService {

    private static final Set<String> PROTECTED_SYSADMIN_PERMISSIONS = Set.of(
        "ROLE_READ", "ROLE_MANAGE", "ADMIN_USER_READ", "ADMIN_USER_MANAGE", "SYSTEM_SETTINGS_MANAGE"
    );

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public AdminRoleService(
        RoleRepository roleRepository,
        PermissionRepository permissionRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    public List<RoleDto> getAllRoles() {
        return roleRepository.findAll().stream().map(this::toRoleDto).toList();
    }

    public List<PermissionDto> getAllPermissions() {
        return permissionRepository.findAll().stream().map(this::toPermissionDto).toList();
    }

    public RoleDto getRoleById(UUID roleId) {
        RoleEntity role = roleRepository.findById(roleId)
            .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleId));
        return toRoleDto(role);
    }

    // Updates role-permission mappings transactionally so authorization changes remain consistent across staff accounts.
    @Transactional
    public RoleDto updateRolePermissions(UUID roleId, UpdateRolePermissionsRequest request) {
        if (!scopeService.isSystemAdmin()) {
            throw new AccessDeniedException("Only System Administrators can manage role permission mappings.");
        }

        RoleEntity role = roleRepository.findById(roleId)
            .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleId));

        Set<String> requestedCodes = new HashSet<>(request.permissionCodes());

        // Safeguard: Protect critical core platform management permissions on SYSTEM_ADMIN role
        if ("SYSTEM_ADMIN".equalsIgnoreCase(role.getCode())) {
            requestedCodes.addAll(PROTECTED_SYSADMIN_PERMISSIONS);
        }

        List<PermissionEntity> matchingPermissions = permissionRepository.findAll().stream()
            .filter(p -> requestedCodes.contains(p.getCode()))
            .toList();

        Set<String> previousCodes = role.getPermissions().stream().map(PermissionEntity::getCode).collect(Collectors.toSet());

        role.setPermissions(new HashSet<>(matchingPermissions));
        roleRepository.save(role);

        Set<String> newCodes = role.getPermissions().stream().map(PermissionEntity::getCode).collect(Collectors.toSet());

        Set<String> added = new HashSet<>(newCodes);
        added.removeAll(previousCodes);

        Set<String> removed = new HashSet<>(previousCodes);
        removed.removeAll(newCodes);

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        auditService.logAction(
            principal.getId(),
            "ROLE_PERMISSIONS_UPDATED",
            "ROLE",
            role.getId(),
            null,
            "Updated permissions for " + role.getCode() + ". Added: " + added + ", Removed: " + removed,
            null,
            null
        );

        return toRoleDto(role);
    }

    private RoleDto toRoleDto(RoleEntity role) {
        Set<String> permCodes = role.getPermissions() != null
            ? role.getPermissions().stream().map(PermissionEntity::getCode).collect(Collectors.toSet())
            : Collections.emptySet();

        return new RoleDto(
            role.getId(),
            role.getCode(),
            role.getName(),
            role.getDescription(),
            role.isSystemRole(),
            permCodes.size(),
            permCodes,
            role.getCreatedAt()
        );
    }

    private PermissionDto toPermissionDto(PermissionEntity perm) {
        String category = deriveCategory(perm.getCode());
        return new PermissionDto(
            perm.getId(),
            perm.getCode(),
            perm.getName(),
            perm.getDescription(),
            category
        );
    }

    private String deriveCategory(String code) {
        if (code == null) return "System";
        String upper = code.toUpperCase(Locale.US);
        if (upper.startsWith("REPORT_") || upper.startsWith("INCIDENT_")) return "Reports";
        if (upper.startsWith("CITIZEN_") || upper.startsWith("PUBLIC_USER_")) return "Citizens";
        if (upper.startsWith("CALL_") || upper.startsWith("EMERGENCY_CALL_")) return "Emergency Calls";
        if (upper.startsWith("FOLLOWUP_")) return "Follow-Ups";
        if (upper.startsWith("TRACKING_")) return "Tracking";
        if (upper.startsWith("STATION_")) return "Stations";
        if (upper.startsWith("APPLIANCE_")) return "Appliances";
        if (upper.startsWith("RESPONDER_")) return "Responders";
        if (upper.startsWith("AGENCY_")) return "Agencies";
        if (upper.startsWith("ROLE_") || upper.startsWith("ADMIN_USER_")) return "Administration";
        if (upper.startsWith("AUDIT_")) return "Audit";
        return "System";
    }
}
