package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.AdminAccessRequestEntity;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.repository.AdminAccessRequestRepository;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AdminAccessRequestService {

    private final AdminAccessRequestRepository requestRepository;
    private final UserManagementRequestService userRequestService;
    private final AdminUserRepository userRepository;
    private final AgencyRepository agencyRepository;
    private final AdminUserService userService;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public AdminAccessRequestService(
        AdminAccessRequestRepository requestRepository,
        UserManagementRequestService userRequestService,
        AdminUserRepository userRepository,
        AgencyRepository agencyRepository,
        AdminUserService userService,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.requestRepository = requestRepository;
        this.userRequestService = userRequestService;
        this.userRepository = userRepository;
        this.agencyRepository = agencyRepository;
        this.userService = userService;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    public List<AdminAccessRequestResponse> getRequests() {
        if (scopeService.isSystemAdmin()) {
            return requestRepository.findAll().stream().map(this::mapToResponse).toList();
        } else {
            UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
            return requestRepository.findByAgencyIdOrderByCreatedAtDesc(agencyId).stream().map(this::mapToResponse).toList();
        }
    }

    // Aggregates Agency Admin Access Requests, Staff Email Change Requests, and 2FA Recovery Code Requests into a Centralized Request Management Center summary.
    public CentralizedRequestSummaryDto getCentralizedSummary() {
        List<AdminAccessRequestResponse> agencyAccessRequests = getRequests();
        List<UserManagementRequestResponse> userManagementRequests = userRequestService.getRequests();

        List<CentralizedRequestItemDto> allItems = new ArrayList<>();

        for (AdminAccessRequestResponse accessReq : agencyAccessRequests) {
            String agencyName = agencyRepository.findById(accessReq.agencyId()).map(AgencyEntity::getName).orElse("National Scope");
            allItems.add(new CentralizedRequestItemDto(
                accessReq.id(),
                "REQ-" + accessReq.id().toString().substring(0, 8).toUpperCase(),
                "AGENCY_ADMIN_ACCESS",
                accessReq.candidateFirstName() + " " + accessReq.candidateLastName(),
                accessReq.candidateFirstName() + " " + accessReq.candidateLastName(),
                accessReq.requestedRole(),
                agencyName,
                accessReq.candidateEmail(),
                null,
                accessReq.reason(),
                accessReq.status(),
                accessReq.createdAt()
            ));
        }

        for (UserManagementRequestResponse userReq : userManagementRequests) {
            AdminUserEntity targetUser = userRepository.findById(userReq.targetUserId()).orElse(null);
            String roleCode = "STAFF_ACCOUNT";
            if (targetUser != null && targetUser.getRoles() != null && !targetUser.getRoles().isEmpty()) {
                roleCode = targetUser.getRoles().iterator().next().getCode();
            }

            allItems.add(new CentralizedRequestItemDto(
                userReq.id(),
                "REQ-" + userReq.id().toString().substring(0, 8).toUpperCase(),
                userReq.requestType(),
                userReq.targetUserName(),
                userReq.targetUserName(),
                roleCode,
                userReq.agencyName() != null ? userReq.agencyName() : "Agency Scope",
                userReq.targetUserEmail(),
                userReq.requestedEmail(),
                userReq.reason(),
                userReq.status(),
                userReq.createdAt()
            ));
        }

        // Default Order: PENDING or PENDING_* first, then newest requestedAt first
        allItems.sort((a, b) -> {
            boolean aPending = a.status() != null && a.status().startsWith("PENDING");
            boolean bPending = b.status() != null && b.status().startsWith("PENDING");
            if (aPending && !bPending) return -1;
            if (!aPending && bPending) return 1;
            return b.requestedAt().compareTo(a.requestedAt());
        });

        List<UserManagementRequestResponse> emailChangeOnlyRequests = userManagementRequests.stream()
            .filter(r -> "EMAIL_CHANGE".equalsIgnoreCase(r.requestType()))
            .toList();

        List<UserManagementRequestResponse> mfaRecoveryOnlyRequests = userManagementRequests.stream()
            .filter(r -> "MFA_RECOVERY_CODE_REISSUE".equalsIgnoreCase(r.requestType()))
            .toList();

        long agencyAccessPendingCount = agencyAccessRequests.stream().filter(r -> "PENDING".equalsIgnoreCase(r.status())).count();
        long emailChangePendingCount = userManagementRequests.stream().filter(r -> "EMAIL_CHANGE".equalsIgnoreCase(r.requestType()) && "PENDING".equalsIgnoreCase(r.status())).count();
        long mfaRecoveryPendingCount = mfaRecoveryOnlyRequests.stream().filter(r -> r.status() != null && r.status().startsWith("PENDING")).count();
        long totalPendingCount = agencyAccessPendingCount + emailChangePendingCount + mfaRecoveryPendingCount;

        return new CentralizedRequestSummaryDto(
            allItems,
            agencyAccessRequests,
            emailChangeOnlyRequests,
            mfaRecoveryOnlyRequests,
            totalPendingCount,
            agencyAccessPendingCount,
            emailChangePendingCount,
            mfaRecoveryPendingCount
        );
    }

    @Transactional
    public AdminAccessRequestResponse submitRequest(CreateAdminAccessRequest request) {
        UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
        UUID actorId = scopeService.getCurrentPrincipal().getId();

        if (requestRepository.existsByCandidateEmailIgnoreCaseAndStatus(request.candidateEmail().trim(), "PENDING")) {
            throw new IllegalArgumentException("A pending request for email " + request.candidateEmail() + " already exists.");
        }

        UUID requestId = UUID.randomUUID();
        AdminAccessRequestEntity entity = new AdminAccessRequestEntity(
            requestId,
            agencyId,
            request.candidateFirstName(),
            request.candidateLastName(),
            request.candidateEmail().trim().toLowerCase(),
            request.candidatePhone(),
            request.reason(),
            actorId
        );
        requestRepository.save(entity);

        auditService.logAction(actorId, "ADMIN_ACCESS_REQUEST_CREATED", "ADMIN_ACCESS_REQUEST", requestId, agencyId, "Submitted request for " + entity.getCandidateEmail(), null, null);

        return mapToResponse(entity);
    }

    @Transactional
    public ApproveAccessRequestResponse approveRequest(UUID requestId) {
        AdminAccessRequestEntity entity = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + requestId));

        if (!"PENDING".equals(entity.getStatus())) {
            throw new IllegalStateException("Request is not in PENDING status.");
        }

        UUID reviewerId = scopeService.getCurrentPrincipal().getId();
        entity.setStatus("APPROVED");
        entity.setReviewedBy(reviewerId);
        entity.setReviewedAt(LocalDateTime.now());
        requestRepository.save(entity);

        // Create the Agency Admin user
        CreateAdminUserRequest userReq = new CreateAdminUserRequest(
            entity.getCandidateEmail(),
            entity.getCandidateFirstName(),
            entity.getCandidateLastName(),
            entity.getCandidatePhone(),
            entity.getAgencyId(),
            null,
            null,
            Set.of("AGENCY_ADMIN")
        );

        CreateUserResponse createdUserResponse = userService.createUser(userReq);

        auditService.logAction(reviewerId, "ADMIN_ACCESS_REQUEST_APPROVED", "ADMIN_ACCESS_REQUEST", requestId, entity.getAgencyId(), "Approved Agency Admin request for " + entity.getCandidateEmail(), null, null);

        return new ApproveAccessRequestResponse(mapToResponse(entity), createdUserResponse.user(), createdUserResponse.tempPassword());
    }

    @Transactional
    public AdminAccessRequestResponse rejectRequest(UUID requestId, String rejectionReason) {
        AdminAccessRequestEntity entity = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + requestId));

        if (!"PENDING".equals(entity.getStatus())) {
            throw new IllegalStateException("Request is not in PENDING status.");
        }

        UUID reviewerId = scopeService.getCurrentPrincipal().getId();
        entity.setStatus("REJECTED");
        entity.setReviewedBy(reviewerId);
        entity.setReviewedAt(LocalDateTime.now());
        entity.setRejectionReason(rejectionReason);
        requestRepository.save(entity);

        auditService.logAction(reviewerId, "ADMIN_ACCESS_REQUEST_REJECTED", "ADMIN_ACCESS_REQUEST", requestId, entity.getAgencyId(), "Rejected request: " + rejectionReason, null, null);

        return mapToResponse(entity);
    }

    private AdminAccessRequestResponse mapToResponse(AdminAccessRequestEntity entity) {
        return new AdminAccessRequestResponse(
            entity.getId(),
            entity.getRequestType(),
            entity.getAgencyId(),
            entity.getRequestedRole(),
            entity.getCandidateFirstName(),
            entity.getCandidateLastName(),
            entity.getCandidateEmail(),
            entity.getCandidatePhone(),
            entity.getReason(),
            entity.getStatus(),
            entity.getRequestedBy(),
            entity.getReviewedBy(),
            entity.getReviewedAt(),
            entity.getRejectionReason(),
            entity.getCreatedAt()
        );
    }
}
