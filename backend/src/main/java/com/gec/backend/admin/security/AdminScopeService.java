package com.gec.backend.admin.security;

import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.entity.RoleEntity;
import com.gec.backend.common.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Authoritative administrative scoping, priority hierarchy, and RBAC authorization service.
 *
 * <p>Enforces multi-tier administrative isolation and priority hierarchy across Ghana Emergency Connect:
 * <ul>
 *   <li><b>SYSTEM_ADMIN:</b> Global system access across all agencies and stations.</li>
 *   <li><b>AGENCY_ADMIN:</b> Restricted strictly to resources owned by their assigned agency.</li>
 *   <li><b>REGIONAL_ADMIN:</b> Restricted to agency resources within their authorized region.</li>
 *   <li><b>STATION_ADMIN:</b> Restricted to their specific assigned emergency station.</li>
 *   <li><b>Priority Hierarchy:</b> Higher priority (lower numeric value, e.g. Priority 1) protects accounts against modification by equal or lower priority staff.</li>
 * </ul>
 */
@Service
public class AdminScopeService {

    public AdminUserPrincipal getCurrentPrincipal() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AdminUserPrincipal principal)) {
            throw new AccessDeniedException("Unauthenticated admin user.");
        }
        return principal;
    }

    public boolean isSystemAdmin() {
        AdminUserPrincipal principal = getCurrentPrincipal();
        return principal.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMIN"));
    }

    public void checkSystemAdminAccess() {
        if (!isSystemAdmin()) {
            throw new AccessDeniedException("Access is restricted to System Administrators.");
        }
    }

    public void validateAgencyScope(UUID targetAgencyId) {
        if (isSystemAdmin()) return;

        AdminUserPrincipal principal = getCurrentPrincipal();
        if (principal.getAgencyId() == null || targetAgencyId == null || !principal.getAgencyId().equals(targetAgencyId)) {
            throw new ResourceNotFoundException("Resource not found or access denied.");
        }
    }

    public void validateStationScope(UUID targetStationAgencyId, UUID targetStationId) {
        validateAgencyScope(targetStationAgencyId);

        AdminUserPrincipal principal = getCurrentPrincipal();
        if (!isSystemAdmin() && principal.getStationId() != null && targetStationId != null) {
            if (!principal.getStationId().equals(targetStationId)) {
                throw new ResourceNotFoundException("Station not found or access denied.");
            }
        }
    }

    /**
     * Evaluates whether an authenticated administrator has authority to manage a target staff account.
     *
     * @param actor the authenticated acting administrator
     * @param target the target staff account being modified
     * @param action the management action being attempted (e.g., UPDATE, DEACTIVATE, RESET_PASSWORD, ASSIGN_PRIORITY)
     * @param proposedPriority proposed priority level for create/update operations
     * @return true if authorized, false if denied
     */
    public boolean canManageTargetAccount(AdminUserEntity actor, AdminUserEntity target, String action, Integer proposedPriority) {
        if (actor == null || target == null) return false;

        // Condition 1: Self-Protection (Cannot disable, delete, demote, or unassign self if Priority 1)
        if (actor.getId().equals(target.getId())) {
            if ("DEACTIVATE".equalsIgnoreCase(action) || "DELETE".equalsIgnoreCase(action) || "DEMOTE".equalsIgnoreCase(action)) {
                return false;
            }
            if (target.getPriorityLevel() != null && target.getPriorityLevel() == 1) {
                if (proposedPriority == null || proposedPriority != 1) {
                    return false; // Priority 1 Lead cannot demote or unassign themselves directly
                }
            }
        }

        boolean actorIsSysAdmin = actor.getRoles() != null && actor.getRoles().stream()
            .map(RoleEntity::getCode).anyMatch(c -> "SYSTEM_ADMIN".equalsIgnoreCase(c) || "ROLE_SYSTEM_ADMIN".equalsIgnoreCase(c));

        boolean targetIsSysAdmin = target.getRoles() != null && target.getRoles().stream()
            .map(RoleEntity::getCode).anyMatch(c -> "SYSTEM_ADMIN".equalsIgnoreCase(c) || "ROLE_SYSTEM_ADMIN".equalsIgnoreCase(c));

        int actorPriority = actor.getPriorityLevel() != null ? actor.getPriorityLevel() : 999;
        int targetPriority = target.getPriorityLevel() != null ? target.getPriorityLevel() : 999;

        // Condition 2: System Admin Priority 1 Safeguard
        if (targetIsSysAdmin && targetPriority == 1) {
            if (!actorIsSysAdmin || actorPriority != 1) {
                return false;
            }
        }

        // Condition 3: Priority Hierarchy Check (Actor priority must be higher = lower numeric value)
        if (!actor.getId().equals(target.getId())) {
            if (actorIsSysAdmin) {
                if (targetIsSysAdmin && actorPriority >= targetPriority) {
                    return false;
                }
            } else {
                if (actorPriority >= targetPriority) {
                    return false;
                }
            }
        }

        // Condition 4: Priority Escalation Prevention
        if (proposedPriority != null) {
            if (!actorIsSysAdmin && proposedPriority <= actorPriority) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validates that the current authenticated administrator is authorized to manage the target user.
     *
     * @throws AccessDeniedException if priority hierarchy or scope validation fails
     */
    public void validateAccountManagementAuthority(AdminUserEntity actor, AdminUserEntity target, String action, Integer proposedPriority) {
        if (!isSystemAdmin()) {
            validateAgencyScope(target.getAgencyId());
        }

        if (!canManageTargetAccount(actor, target, action, proposedPriority)) {
            throw new AccessDeniedException("HIERARCHY_ACCESS_DENIED: You cannot perform administrative action '" + action + "' on an account with equal or higher administrative priority.");
        }
    }
}
