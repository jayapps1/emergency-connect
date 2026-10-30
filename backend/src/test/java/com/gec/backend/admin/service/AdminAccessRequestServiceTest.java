package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.AdminAccessRequestEntity;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.repository.AdminAccessRequestRepository;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

class AdminAccessRequestServiceTest {

    private final AdminAccessRequestRepository requestRepository = Mockito.mock(AdminAccessRequestRepository.class);
    private final AdminUserService userService = Mockito.mock(AdminUserService.class);
    private final AdminScopeService scopeService = Mockito.mock(AdminScopeService.class);
    private final AuditService auditService = Mockito.mock(AuditService.class);

    private final AdminAccessRequestService requestService = new AdminAccessRequestService(
        requestRepository, userService, scopeService, auditService
    );

    private final UUID agencyId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        AdminUserEntity admin = new AdminUserEntity();
        admin.setId(userId);
        admin.setEmail("sysadmin@gec.gov.gh");
        admin.setAgencyId(agencyId);
        admin.setRoles(Set.of());

        AdminUserPrincipal principal = new AdminUserPrincipal(admin);
        given(scopeService.getCurrentPrincipal()).willReturn(principal);
        given(scopeService.isSystemAdmin()).willReturn(true);
    }

    @Test
    void submitRequest_createsPendingRequest() {
        CreateAdminAccessRequest request = new CreateAdminAccessRequest(
            "Kofi", "Annan", "kofi.annan@gnfs.gov.gh", "+233240001122", "Need additional agency admin for NHQ"
        );

        given(requestRepository.existsByCandidateEmailIgnoreCaseAndStatus("kofi.annan@gnfs.gov.gh", "PENDING")).willReturn(false);

        AdminAccessRequestResponse response = requestService.submitRequest(request);

        assertNotNull(response);
        assertEquals("kofi.annan@gnfs.gov.gh", response.candidateEmail());
        assertEquals("PENDING", response.status());
    }

    @Test
    void approveRequest_createsUserAndReturnsTempPassword() {
        UUID requestId = UUID.randomUUID();
        AdminAccessRequestEntity entity = new AdminAccessRequestEntity(
            requestId, agencyId, "Kwame", "Nkrumah", "kwame@gnfs.gov.gh", "+233240001122", "Need NHQ admin", userId
        );

        given(requestRepository.findById(requestId)).willReturn(Optional.of(entity));

        AdminUserResponse userResp = new AdminUserResponse(
            UUID.randomUUID(), "kwame@gnfs.gov.gh", "Kwame", "Nkrumah", "+233240001122",
            agencyId, "Ghana National Fire Service", null, null, null, true, false, true, false, null, Set.of("AGENCY_ADMIN")
        );
        given(userService.createUser(any())).willReturn(new CreateUserResponse(userResp, "Gec!TempPassword123"));

        ApproveAccessRequestResponse result = requestService.approveRequest(requestId);

        assertNotNull(result);
        assertEquals("APPROVED", result.request().status());
        assertEquals("Gec!TempPassword123", result.temporaryPassword());
    }
}
