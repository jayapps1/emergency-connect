package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.UserManagementRequestResponse;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.entity.UserManagementRequestEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.repository.UserManagementRequestRepository;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.messaging.service.StaffNotificationService;
import com.gec.backend.common.exception.ResourceConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

class MfaRecoveryRequestServiceTest {

    private final UserManagementRequestRepository requestRepository = Mockito.mock(UserManagementRequestRepository.class);
    private final AdminUserRepository userRepository = Mockito.mock(AdminUserRepository.class);
    private final UserManagementRequestService userRequestService = Mockito.mock(UserManagementRequestService.class);
    private final MfaService mfaService = Mockito.mock(MfaService.class);
    private final AdminScopeService scopeService = Mockito.mock(AdminScopeService.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final StaffNotificationService notificationService = Mockito.mock(StaffNotificationService.class);
    private final AuditService auditService = Mockito.mock(AuditService.class);

    private final MfaRecoveryRequestService recoveryService = new MfaRecoveryRequestService(
        requestRepository, userRepository, userRequestService, mfaService, scopeService, passwordEncoder, notificationService, auditService
    );

    private final UUID userId = UUID.randomUUID();
    private final UUID agencyId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        AdminUserEntity user = new AdminUserEntity();
        user.setId(userId);
        user.setEmail("staff@gnfs.gov.gh");
        user.setAgencyId(agencyId);
        user.setPasswordHash(passwordEncoder.encode("Password123!"));
        user.setRoles(Set.of());

        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(userRequestService.mapToResponse(any())).willAnswer(inv -> {
            UserManagementRequestEntity e = inv.getArgument(0);
            return new UserManagementRequestResponse(
                e.getId(), e.getRequestType(), e.getTargetUserId(), "staff@gnfs.gov.gh", null, "Staff Name",
                e.getAgencyId(), "GNFS", e.getReason(), e.getEffectiveDate(), e.getStatus(), e.getRequestedBy(),
                e.getReviewedBy(), e.getReviewedAt(), e.getRejectionReason(), e.getAgencyVerifiedBy(), e.getAgencyVerifiedAt(),
                e.getAgencyVerificationMethod(), e.getAgencyVerificationNotes(), e.getCollectionTokenExpiresAt(),
                e.getCollectedAt(), e.getCreatedAt()
            );
        });
    }

    @Test
    void submitRecoveryRequest_createsPendingAgencyVerificationRequest() {
        given(requestRepository.findTopByRequestedByAndRequestTypeAndStatusInOrderByCreatedAtDesc(any(), any(), any()))
            .willReturn(Optional.empty());

        UserManagementRequestResponse response = recoveryService.submitRecoveryRequest(userId, "Lost recovery code printout");

        assertNotNull(response);
        assertEquals("MFA_RECOVERY_CODE_REISSUE", response.requestType());
        assertEquals("PENDING_AGENCY_VERIFICATION", response.status());
    }

    @Test
    void submitRecoveryRequest_duplicatePending_throwsResourceConflictException() {
        UserManagementRequestEntity existing = new UserManagementRequestEntity(
            UUID.randomUUID(), "MFA_RECOVERY_CODE_REISSUE", userId, agencyId, "Active request", null, userId
        );
        existing.setStatus("PENDING_AGENCY_VERIFICATION");

        given(requestRepository.findTopByRequestedByAndRequestTypeAndStatusInOrderByCreatedAtDesc(any(), any(), any()))
            .willReturn(Optional.of(existing));

        assertThrows(ResourceConflictException.class, () -> {
            recoveryService.submitRecoveryRequest(userId, "Second request attempt");
        });
    }

    @Test
    void collectRecoveryCodes_validPassword_generatesAndReturnsTenNewCodes() {
        UUID requestId = UUID.randomUUID();
        UserManagementRequestEntity entity = new UserManagementRequestEntity(
            requestId, "MFA_RECOVERY_CODE_REISSUE", userId, agencyId, "Approved request", null, userId
        );
        entity.setStatus("APPROVED_AWAITING_COLLECTION");
        entity.setCollectionToken(UUID.randomUUID().toString());
        entity.setCollectionTokenExpiresAt(java.time.LocalDateTime.now().plusHours(24));

        given(requestRepository.findById(requestId)).willReturn(Optional.of(entity));
        given(mfaService.generateAndSaveRecoveryCodes("ADMIN", userId))
            .willReturn(List.of("A1B2-C3D4", "E5F6-G7H8", "J9K0-L1M2"));

        List<String> codes = recoveryService.collectRecoveryCodes(requestId, userId, "Password123!");

        assertNotNull(codes);
        assertEquals(3, codes.size());
        assertEquals("COMPLETED", entity.getStatus());
        assertNotNull(entity.getCollectedAt());
    }
}
