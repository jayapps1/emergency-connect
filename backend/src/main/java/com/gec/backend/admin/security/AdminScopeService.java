package com.gec.backend.admin.security;

import com.gec.backend.common.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Authoritative administrative scoping and RBAC authorization service.
 *
 * <p>Enforces multi-tier administrative isolation across Ghana Emergency Connect:
 * <ul>
 *   <li><b>SYSTEM_ADMIN:</b> Global system access across all agencies and stations.</li>
 *   <li><b>AGENCY_ADMIN:</b> Restricted strictly to resources owned by their assigned agency.</li>
 *   <li><b>REGIONAL_ADMIN:</b> Restricted to agency resources within their authorized region.</li>
 *   <li><b>STATION_ADMIN:</b> Restricted to their specific assigned emergency station.</li>
 * </ul>
 *
 * <p>Client-supplied agency or station identifiers are never trusted for non-system roles;
 * agency ownership is always validated against the authenticated SecurityContext principal.
 */
@Service
public class AdminScopeService {

    /**
     * Resolves the authenticated administrative principal from the current Spring Security context.
     *
     * @return the active {@link AdminUserPrincipal}
     * @throws AccessDeniedException if the user is unauthenticated or principal type is invalid
     */
    public AdminUserPrincipal getCurrentPrincipal() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AdminUserPrincipal principal)) {
            throw new AccessDeniedException("Unauthenticated admin user.");
        }
        return principal;
    }

    /**
     * Checks whether the current authenticated user holds global SYSTEM_ADMIN authority.
     *
     * @return true if the principal possesses ROLE_SYSTEM_ADMIN
     */
    public boolean isSystemAdmin() {
        AdminUserPrincipal principal = getCurrentPrincipal();
        return principal.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMIN"));
    }

    /**
     * Validates that the current administrator is authorized to access or modify resources
     * owned by the target agency.
     *
     * <p>SYSTEM_ADMIN users bypass agency restrictions. For all other roles, the target agency ID
     * must match the authenticated principal's agency assignment.
     *
     * @param targetAgencyId the UUID of the agency owning the requested resource
     * @throws ResourceNotFoundException if access is denied (obfuscated as not found to prevent enumeration)
     */
    public void validateAgencyScope(UUID targetAgencyId) {
        if (isSystemAdmin()) return;

        AdminUserPrincipal principal = getCurrentPrincipal();
        if (principal.getAgencyId() == null || targetAgencyId == null || !principal.getAgencyId().equals(targetAgencyId)) {
            throw new ResourceNotFoundException("Resource not found or access denied.");
        }
    }

    /**
     * Validates both agency-level and station-level authorization scopes for a target station resource.
     *
     * @param targetStationAgencyId the UUID of the agency owning the station
     * @param targetStationId the UUID of the target station
     * @throws ResourceNotFoundException if agency or station scope validation fails
     */
    public void validateStationScope(UUID targetStationAgencyId, UUID targetStationId) {
        validateAgencyScope(targetStationAgencyId);

        AdminUserPrincipal principal = getCurrentPrincipal();
        if (!isSystemAdmin() && principal.getStationId() != null && targetStationId != null) {
            if (!principal.getStationId().equals(targetStationId)) {
                throw new ResourceNotFoundException("Station not found or access denied.");
            }
        }
    }
}
