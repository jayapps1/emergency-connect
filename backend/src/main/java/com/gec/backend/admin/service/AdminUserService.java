package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.*;
import com.gec.backend.admin.repository.*;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.messaging.service.StaffNotificationService;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * System Admin manages internal identities but has read-only visibility
 * into agency appliance operations.
 */
@Service
public class AdminUserService {

    private final AdminUserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AgencyRepository agencyRepository;
    private final StationRepository stationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminScopeService scopeService;
    private final StaffNotificationService notificationService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminUserService(
        AdminUserRepository userRepository,
        RoleRepository roleRepository,
        AgencyRepository agencyRepository,
        StationRepository stationRepository,
        PasswordEncoder passwordEncoder,
        AdminScopeService scopeService,
        StaffNotificationService notificationService,
        AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.agencyRepository = agencyRepository;
        this.stationRepository = stationRepository;
        this.passwordEncoder = passwordEncoder;
        this.scopeService = scopeService;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    public Page<AdminUserResponse> getUsers(Pageable pageable) {
        if (scopeService.isSystemAdmin()) {
            return userRepository.findAll(pageable).map(this::mapToResponse);
        } else {
            UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
            return userRepository.findByAgencyId(agencyId, pageable).map(this::mapToResponse);
        }
    }

    public AdminUserResponse getUserById(UUID id) {
        AdminUserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        if (user.getAgencyId() != null) {
            scopeService.validateAgencyScope(user.getAgencyId());
        } else if (!scopeService.isSystemAdmin()) {
            throw new ResourceNotFoundException("User not found: " + id);
        }

        return mapToResponse(user);
    }

    @Transactional
    public CreateUserResponse createUser(CreateAdminUserRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email().trim())) {
            throw new IllegalArgumentException("User with email already exists: " + request.email());
        }

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        AdminUserEntity actor = userRepository.findById(principal.getId()).orElse(null);

        UUID targetAgencyId = request.agencyId();
        if (!scopeService.isSystemAdmin()) {
            targetAgencyId = principal.getAgencyId();
        }

        Integer requestedPriority = request.priorityLevel();
        if (actor != null && !scopeService.isSystemAdmin() && requestedPriority != null) {
            int actorPriority = actor.getPriorityLevel() != null ? actor.getPriorityLevel() : 999;
            if (requestedPriority <= actorPriority) {
                throw new IllegalArgumentException("PRIORITY_ESCALATION_DENIED: You cannot assign a priority level equal to or higher than your own priority (" + actorPriority + ").");
            }
        }

        Set<RoleEntity> roles = new HashSet<>();
        if (request.roleCodes() != null && !request.roleCodes().isEmpty()) {
            for (String code : request.roleCodes()) {
                if (code.equals("SYSTEM_ADMIN") && !scopeService.isSystemAdmin()) {
                    throw new IllegalArgumentException("Agency Admin cannot assign SYSTEM_ADMIN role.");
                }
                RoleEntity role = roleRepository.findByCode(code)
                    .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + code));
                roles.add(role);
            }
        }

        UUID actorId = principal.getId();
        UUID userId = UUID.randomUUID();
        String tempPassword = generateTempPassword();

        AdminUserEntity user = new AdminUserEntity();
        user.setId(userId);
        user.setEmail(request.email().trim().toLowerCase(Locale.US));
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhoneNumber(request.phoneNumber());
        user.setAgencyId(targetAgencyId);
        user.setRegion(request.region());
        user.setStationId(request.stationId());
        user.setPriorityLevel(requestedPriority);
        user.setActive(true);
        user.setMustChangePassword(true);
        user.setTemporaryPasswordIssuedAt(LocalDateTime.now());
        user.setRoles(roles);
        user.setCreatedBy(actorId);

        userRepository.save(user);

        auditService.logAction(actorId, "ADMIN_USER_CREATED", "ADMIN_USER", userId, targetAgencyId, "Created admin user " + user.getEmail() + (requestedPriority != null ? " with Priority " + requestedPriority : " (Unassigned Priority)"), null, null);

        return new CreateUserResponse(mapToResponse(user), tempPassword);
    }

    @Transactional
    public AdminUserResponse updateUser(UUID id, CreateAdminUserRequest request) {
        AdminUserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        AdminUserEntity actor = userRepository.findById(principal.getId()).orElse(null);

        Integer newPriority = request.priorityLevel();
        if (actor != null) {
            scopeService.validateAccountManagementAuthority(actor, user, "UPDATE", newPriority);
        }

        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhoneNumber(request.phoneNumber());

        if (scopeService.isSystemAdmin() && request.agencyId() != null) {
            user.setAgencyId(request.agencyId());
        }
        user.setRegion(request.region());
        user.setStationId(request.stationId());

        user.setPriorityLevel(newPriority);

        if (request.roleCodes() != null && !request.roleCodes().isEmpty()) {
            Set<RoleEntity> roles = new HashSet<>();
            for (String code : request.roleCodes()) {
                if (code.equals("SYSTEM_ADMIN") && !scopeService.isSystemAdmin()) {
                    throw new IllegalArgumentException("Agency Admin cannot assign SYSTEM_ADMIN role.");
                }
                RoleEntity role = roleRepository.findByCode(code)
                    .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + code));
                roles.add(role);
            }
            user.setRoles(roles);
        }

        user = userRepository.save(user);

        UUID actorId = principal.getId();
        auditService.logAction(actorId, "ADMIN_USER_UPDATED", "ADMIN_USER", id, user.getAgencyId(), "Updated admin user " + user.getEmail() + "; Priority=" + user.getPriorityLevel(), null, null);

        return mapToResponse(user);
    }

    @Transactional
    public AdminUserResponse deactivateUser(UUID id) {
        AdminUserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        AdminUserEntity actor = userRepository.findById(principal.getId()).orElse(null);

        if (actor != null) {
            scopeService.validateAccountManagementAuthority(actor, user, "DEACTIVATE", null);
        }

        user.setActive(false);
        userRepository.save(user);

        UUID actorId = principal.getId();
        auditService.logAction(actorId, "ADMIN_USER_DEACTIVATED", "ADMIN_USER", id, user.getAgencyId(), "Deactivated admin user " + user.getEmail(), null, null);

        return mapToResponse(user);
    }

    @Transactional
    public AdminUserResponse reactivateUser(UUID id) {
        AdminUserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        AdminUserEntity actor = userRepository.findById(principal.getId()).orElse(null);

        if (actor != null) {
            scopeService.validateAccountManagementAuthority(actor, user, "REACTIVATE", null);
        }

        user.setActive(true);
        user.setLocked(false);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        UUID actorId = principal.getId();
        auditService.logAction(actorId, "ADMIN_USER_REACTIVATED", "ADMIN_USER", id, user.getAgencyId(), "Reactivated admin user " + user.getEmail(), null, null);

        return mapToResponse(user);
    }

    @Transactional
    public Map<String, String> resetUserPassword(UUID id) {
        AdminUserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        AdminUserEntity actor = userRepository.findById(principal.getId()).orElse(null);

        if (actor != null) {
            scopeService.validateAccountManagementAuthority(actor, user, "RESET_PASSWORD", null);
        }

        String tempPassword = generateTempPassword();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setMustChangePassword(true);
        user.setTemporaryPasswordIssuedAt(LocalDateTime.now());
        user.setFailedLoginAttempts(0);
        user.setLocked(false);
        userRepository.save(user);

        UUID actorId = principal.getId();
        auditService.logAction(actorId, "ADMIN_USER_PASSWORD_RESET", "ADMIN_USER", id, user.getAgencyId(), "Reset password for user " + user.getEmail(), null, null);

        Map<String, String> response = new HashMap<>();
        response.put("email", user.getEmail());
        response.put("temporaryPassword", tempPassword);
        return response;
    }

    @Transactional
    public AdminUserResponse transferAgencyLeadership(UUID recipientUserId, String password, String reason) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        AdminUserEntity actor = userRepository.findById(principal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Actor user not found"));

        if (password == null || password.isBlank() || !passwordEncoder.matches(password, actor.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect. Unable to transfer agency leadership.");
        }

        AdminUserEntity recipient = userRepository.findById(recipientUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Recipient user not found: " + recipientUserId));

        if (!recipient.isActive()) {
            throw new IllegalStateException("RECIPIENT_INACTIVE: Cannot transfer agency leadership to an inactive account.");
        }

        boolean actorIsSysAdmin = scopeService.isSystemAdmin();
        UUID targetAgencyId = recipient.getAgencyId();

        if (targetAgencyId == null) {
            throw new IllegalStateException("Recipient account does not belong to an agency.");
        }

        if (!actorIsSysAdmin) {
            scopeService.validateAgencyScope(targetAgencyId);
            int actorPriority = actor.getPriorityLevel() != null ? actor.getPriorityLevel() : 999;
            if (actorPriority != 1) {
                throw new AccessDeniedException("LEADERSHIP_TRANSFER_DENIED: Only the current Priority 1 Agency Lead or System Administration can transfer agency leadership.");
            }
        }

        boolean isRecipientAgencyAdmin = recipient.getRoles() != null && recipient.getRoles().stream()
            .map(RoleEntity::getCode).anyMatch(c -> "AGENCY_ADMIN".equalsIgnoreCase(c) || "ROLE_AGENCY_ADMIN".equalsIgnoreCase(c));

        if (!isRecipientAgencyAdmin) {
            throw new IllegalArgumentException("RECIPIENT_NOT_AGENCY_ADMIN: Leadership can only be transferred to an active Agency Administrator.");
        }

        List<AdminUserEntity> agencyUsers = userRepository.findByAgencyId(targetAgencyId);
        for (AdminUserEntity u : agencyUsers) {
            if (u.getId().equals(recipientUserId)) {
                u.setPriorityLevel(1);
            } else if (u.getPriorityLevel() != null && u.getPriorityLevel() == 1) {
                u.setPriorityLevel(2);
            }
            userRepository.save(u);
        }

        auditService.logAction(actor.getId(), "AGENCY_LEADERSHIP_TRANSFERRED", "AGENCY", targetAgencyId, targetAgencyId,
            "Transferred agency leadership to " + recipient.getEmail() + ". Reason: " + (reason != null ? reason : "Leadership handover"), null, null);

        notificationService.sendNotification(recipientUserId, "Agency Leadership Transferred",
            "You have been designated as Priority 1 (Agency Lead) for your agency.", "LEADERSHIP_TRANSFER", "/my-requests");

        if (!actor.getId().equals(recipientUserId)) {
            notificationService.sendNotification(actor.getId(), "Agency Leadership Transferred",
                "Agency leadership has been transferred successfully to " + recipient.getFirstName() + " " + recipient.getLastName() + ".", "LEADERSHIP_TRANSFER", "/my-requests");
        }

        return mapToResponse(recipient);
    }

    @Transactional
    public AdminUserResponse transferNationalLeadership(UUID recipientUserId, String password, String reason) {
        scopeService.checkSystemAdminAccess();

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        AdminUserEntity actor = userRepository.findById(principal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Actor user not found"));

        int actorPriority = actor.getPriorityLevel() != null ? actor.getPriorityLevel() : 999;
        if (actorPriority != 1) {
            throw new AccessDeniedException("NATIONAL_LEADERSHIP_TRANSFER_DENIED: Only the current National System Admin Lead (Priority 1) can transfer national leadership.");
        }

        if (password == null || password.isBlank() || !passwordEncoder.matches(password, actor.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect. Unable to transfer national leadership.");
        }

        AdminUserEntity recipient = userRepository.findById(recipientUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Recipient user not found: " + recipientUserId));

        if (!recipient.isActive()) {
            throw new IllegalStateException("RECIPIENT_INACTIVE: Cannot transfer national leadership to an inactive account.");
        }

        boolean isRecipientSysAdmin = recipient.getRoles() != null && recipient.getRoles().stream()
            .map(RoleEntity::getCode).anyMatch(c -> "SYSTEM_ADMIN".equalsIgnoreCase(c) || "ROLE_SYSTEM_ADMIN".equalsIgnoreCase(c));

        if (!isRecipientSysAdmin) {
            throw new IllegalArgumentException("RECIPIENT_NOT_SYSTEM_ADMIN: National leadership can only be transferred to an active System Administrator.");
        }

        List<AdminUserEntity> allUsers = userRepository.findAll();
        for (AdminUserEntity u : allUsers) {
            boolean isSysAdmin = u.getRoles() != null && u.getRoles().stream()
                .map(RoleEntity::getCode).anyMatch(c -> "SYSTEM_ADMIN".equalsIgnoreCase(c) || "ROLE_SYSTEM_ADMIN".equalsIgnoreCase(c));
            if (isSysAdmin) {
                if (u.getId().equals(recipientUserId)) {
                    u.setPriorityLevel(1);
                } else if (u.getPriorityLevel() != null && u.getPriorityLevel() == 1) {
                    u.setPriorityLevel(2);
                }
                userRepository.save(u);
            }
        }

        auditService.logAction(actor.getId(), "NATIONAL_LEADERSHIP_TRANSFERRED", "SYSTEM_ADMIN", recipientUserId, null,
            "Transferred national System Admin leadership to " + recipient.getEmail() + ". Reason: " + (reason != null ? reason : "National handover"), null, null);

        notificationService.sendNotification(recipientUserId, "National Leadership Transferred",
            "You have been designated as Priority 1 (National Lead) for System Administration.", "LEADERSHIP_TRANSFER", "/my-requests");

        return mapToResponse(recipient);
    }

    @Transactional
    public List<AdminUserResponse> configureAgencyPriorities(UUID agencyId, Map<UUID, Integer> priorityMap) {
        scopeService.checkSystemAdminAccess();

        if (priorityMap == null || priorityMap.isEmpty()) {
            throw new IllegalArgumentException("Priority assignments map cannot be empty.");
        }

        long priority1Count = priorityMap.values().stream().filter(p -> p != null && p == 1).count();
        if (priority1Count > 1) {
            throw new IllegalArgumentException("ONLY_ONE_PRIORITY_1_ALLOWED: An agency can have at most one Priority 1 (Agency Lead) administrator.");
        }

        List<AdminUserResponse> updatedUsers = new ArrayList<>();
        for (Map.Entry<UUID, Integer> entry : priorityMap.entrySet()) {
            UUID uId = entry.getKey();
            Integer level = entry.getValue();

            AdminUserEntity user = userRepository.findById(uId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + uId));

            if (!agencyId.equals(user.getAgencyId())) {
                throw new IllegalArgumentException("User " + user.getEmail() + " does not belong to agency " + agencyId);
            }

            user.setPriorityLevel(level);
            userRepository.save(user);
            updatedUsers.add(mapToResponse(user));
        }

        UUID sysAdminId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(sysAdminId, "AGENCY_PRIORITIES_CONFIGURED", "AGENCY", agencyId, agencyId,
            "Configured staff priority hierarchy for agency " + agencyId, null, null);

        return updatedUsers;
    }

    private AdminUserResponse mapToResponse(AdminUserEntity user) {
        Set<String> roleCodes = user.getRoles() != null
            ? user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toSet())
            : Collections.emptySet();

        String agencyName = user.getAgencyId() != null
            ? agencyRepository.findById(user.getAgencyId()).map(AgencyEntity::getName).orElse(null)
            : null;

        String stationName = user.getStationId() != null
            ? stationRepository.findById(user.getStationId()).map(StationEntity::getName).orElse(null)
            : null;

        return new AdminUserResponse(
            user.getId(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getPhoneNumber(),
            user.getAgencyId(),
            agencyName,
            user.getRegion(),
            user.getStationId(),
            stationName,
            user.getPriorityLevel(),
            user.isActive(),
            user.isLocked(),
            user.isMustChangePassword(),
            user.isTotpEnabled(),
            user.getLastLoginAt(),
            roleCodes
        );
    }

    private String generateTempPassword() {
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghijkmnpqrstuvwxyz";
        String digits = "23456789";
        String special = "@#$!";

        StringBuilder sb = new StringBuilder();
        sb.append(upper.charAt(secureRandom.nextInt(upper.length())));
        sb.append(lower.charAt(secureRandom.nextInt(lower.length())));
        sb.append(digits.charAt(secureRandom.nextInt(digits.length())));
        sb.append(special.charAt(secureRandom.nextInt(special.length())));

        String all = upper + lower + digits + special;
        for (int i = 4; i < 10; i++) {
            sb.append(all.charAt(secureRandom.nextInt(all.length())));
        }

        return sb.toString();
    }
}
