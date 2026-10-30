package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.*;
import com.gec.backend.admin.repository.*;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminUserService(
        AdminUserRepository userRepository,
        RoleRepository roleRepository,
        AgencyRepository agencyRepository,
        StationRepository stationRepository,
        PasswordEncoder passwordEncoder,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.agencyRepository = agencyRepository;
        this.stationRepository = stationRepository;
        this.passwordEncoder = passwordEncoder;
        this.scopeService = scopeService;
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

        UUID targetAgencyId = request.agencyId();
        if (!scopeService.isSystemAdmin()) {
            targetAgencyId = scopeService.getCurrentPrincipal().getAgencyId();
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

        UUID actorId = scopeService.getCurrentPrincipal().getId();
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
        user.setActive(true);
        user.setMustChangePassword(true);
        user.setTemporaryPasswordIssuedAt(LocalDateTime.now());
        user.setRoles(roles);
        user.setCreatedBy(actorId);

        userRepository.save(user);

        auditService.logAction(actorId, "ADMIN_USER_CREATED", "ADMIN_USER", userId, targetAgencyId, "Created admin user " + user.getEmail(), null, null);

        return new CreateUserResponse(mapToResponse(user), tempPassword);
    }

    @Transactional
    public AdminUserResponse updateUser(UUID id, CreateAdminUserRequest request) {
        AdminUserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        if (user.getAgencyId() != null && !scopeService.isSystemAdmin()) {
            scopeService.validateAgencyScope(user.getAgencyId());
        }

        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhoneNumber(request.phoneNumber());

        if (scopeService.isSystemAdmin() && request.agencyId() != null) {
            user.setAgencyId(request.agencyId());
        }
        user.setRegion(request.region());
        user.setStationId(request.stationId());

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

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "ADMIN_USER_UPDATED", "ADMIN_USER", id, user.getAgencyId(), "Updated admin user " + user.getEmail(), null, null);

        return mapToResponse(user);
    }

    @Transactional
    public AdminUserResponse deactivateUser(UUID id) {
        AdminUserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        if (user.getAgencyId() != null) {
            scopeService.validateAgencyScope(user.getAgencyId());
        }

        user.setActive(false);
        userRepository.save(user);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "ADMIN_USER_DEACTIVATED", "ADMIN_USER", id, user.getAgencyId(), "Deactivated admin user " + user.getEmail(), null, null);

        return mapToResponse(user);
    }

    @Transactional
    public AdminUserResponse reactivateUser(UUID id) {
        AdminUserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        if (user.getAgencyId() != null) {
            scopeService.validateAgencyScope(user.getAgencyId());
        }

        user.setActive(true);
        user.setLocked(false);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "ADMIN_USER_REACTIVATED", "ADMIN_USER", id, user.getAgencyId(), "Reactivated admin user " + user.getEmail(), null, null);

        return mapToResponse(user);
    }

    @Transactional
    public Map<String, String> resetUserPassword(UUID id) {
        AdminUserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        if (user.getAgencyId() != null) {
            scopeService.validateAgencyScope(user.getAgencyId());
        }

        String tempPassword = generateTempPassword();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setMustChangePassword(true);
        user.setTemporaryPasswordIssuedAt(LocalDateTime.now());
        user.setFailedLoginAttempts(0);
        user.setLocked(false);
        userRepository.save(user);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "ADMIN_USER_PASSWORD_RESET", "ADMIN_USER", id, user.getAgencyId(), "Reset password for user " + user.getEmail(), null, null);

        Map<String, String> response = new HashMap<>();
        response.put("email", user.getEmail());
        response.put("temporaryPassword", tempPassword);
        return response;
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
