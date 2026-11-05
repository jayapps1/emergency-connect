package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.AdminUserResponse;
import com.gec.backend.admin.dto.CreateAdminUserRequest;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.entity.RoleEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.repository.RoleRepository;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.messaging.service.StaffNotificationService;
import com.gec.backend.station.repository.StationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

class AdminUserServiceTest {

    private final AdminUserRepository userRepository = Mockito.mock(AdminUserRepository.class);
    private final RoleRepository roleRepository = Mockito.mock(RoleRepository.class);
    private final AgencyRepository agencyRepository = Mockito.mock(AgencyRepository.class);
    private final StationRepository stationRepository = Mockito.mock(StationRepository.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final AdminScopeService scopeService = Mockito.mock(AdminScopeService.class);
    private final StaffNotificationService notificationService = Mockito.mock(StaffNotificationService.class);
    private final AuditService auditService = Mockito.mock(AuditService.class);

    private final AdminUserService userService = new AdminUserService(
        userRepository, roleRepository, agencyRepository, stationRepository, passwordEncoder, scopeService, notificationService, auditService
    );

    private final UUID agencyId = UUID.randomUUID();
    private final UUID actorP2Id = UUID.randomUUID();
    private final UUID targetP1Id = UUID.randomUUID();

    private AdminUserEntity actorP2;
    private AdminUserEntity targetP1;

    @BeforeEach
    void setUp() {
        RoleEntity agencyAdminRole = new RoleEntity();
        agencyAdminRole.setCode("AGENCY_ADMIN");

        actorP2 = new AdminUserEntity();
        actorP2.setId(actorP2Id);
        actorP2.setEmail("actorP2@gnfs.gov.gh");
        actorP2.setAgencyId(agencyId);
        actorP2.setPriorityLevel(2);
        actorP2.setRoles(Set.of(agencyAdminRole));

        targetP1 = new AdminUserEntity();
        targetP1.setId(targetP1Id);
        targetP1.setEmail("targetP1@gnfs.gov.gh");
        targetP1.setAgencyId(agencyId);
        targetP1.setPriorityLevel(1);
        targetP1.setRoles(Set.of(agencyAdminRole));

        AdminUserPrincipal actorPrincipal = new AdminUserPrincipal(actorP2);

        given(scopeService.getCurrentPrincipal()).willReturn(actorPrincipal);
        given(scopeService.isSystemAdmin()).willReturn(false);
        given(userRepository.findById(actorP2Id)).willReturn(Optional.of(actorP2));
        given(userRepository.findById(targetP1Id)).willReturn(Optional.of(targetP1));

        given(scopeService.canManageTargetAccount(any(), any(), any(), any()))
            .willAnswer(inv -> {
                AdminUserEntity act = inv.getArgument(0);
                AdminUserEntity tgt = inv.getArgument(1);
                String action = inv.getArgument(2);
                if (act.getId().equals(tgt.getId()) && "DEACTIVATE".equalsIgnoreCase(action)) return false;
                return act.getPriorityLevel() < tgt.getPriorityLevel();
            });

        Mockito.doAnswer(inv -> {
            AdminUserEntity act = inv.getArgument(0);
            AdminUserEntity tgt = inv.getArgument(1);
            String action = inv.getArgument(2);
            if (!act.getId().equals(tgt.getId()) && act.getPriorityLevel() >= tgt.getPriorityLevel()) {
                throw new AccessDeniedException("HIERARCHY_ACCESS_DENIED: Priority " + act.getPriorityLevel() + " cannot manage Priority " + tgt.getPriorityLevel());
            }
            if (act.getId().equals(tgt.getId()) && "DEACTIVATE".equalsIgnoreCase(action)) {
                throw new AccessDeniedException("SELF_DEACTIVATION_DENIED");
            }
            return null;
        }).when(scopeService).validateAccountManagementAuthority(any(), any(), any(), any());
    }

    @Test
    void deactivateUser_lowerPriorityActorManagingHigherPriorityTarget_throwsAccessDeniedException() {
        assertThrows(AccessDeniedException.class, () -> {
            userService.deactivateUser(targetP1Id);
        });
    }

    @Test
    void updateUser_lowerPriorityActorManagingHigherPriorityTarget_throwsAccessDeniedException() {
        CreateAdminUserRequest updateReq = new CreateAdminUserRequest(
            "targetP1@gnfs.gov.gh", "Target", "User", "+233240001122", agencyId, "Accra", null, 1, Set.of("AGENCY_ADMIN")
        );

        assertThrows(AccessDeniedException.class, () -> {
            userService.updateUser(targetP1Id, updateReq);
        });
    }

    @Test
    void deactivateUser_selfDeactivation_throwsAccessDeniedException() {
        assertThrows(AccessDeniedException.class, () -> {
            userService.deactivateUser(actorP2Id);
        });
    }
}
