package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.CreateUserManagementRequest;
import com.gec.backend.admin.dto.UserManagementRequestResponse;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.entity.StaffEmailHistoryEntity;
import com.gec.backend.admin.entity.UserManagementRequestEntity;
import com.gec.backend.admin.repository.AdminRefreshTokenRepository;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.repository.StaffEmailHistoryRepository;
import com.gec.backend.admin.repository.UserManagementRequestRepository;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class UserManagementRequestService {

    private final UserManagementRequestRepository requestRepository;
    private final AdminUserRepository userRepository;
    private final AgencyRepository agencyRepository;
    private final AdminRefreshTokenRepository refreshTokenRepository;
    private final StaffEmailHistoryRepository emailHistoryRepository;
    private final AdminUserService userService;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public UserManagementRequestService(
        UserManagementRequestRepository requestRepository,
        AdminUserRepository userRepository,
        AgencyRepository agencyRepository,
        AdminRefreshTokenRepository refreshTokenRepository,
        StaffEmailHistoryRepository emailHistoryRepository,
        AdminUserService userService,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.agencyRepository = agencyRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.emailHistoryRepository = emailHistoryRepository;
        this.userService = userService;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    // Uses the same persisted request source for submission and System Administration review so pending identity changes cannot disappear between workflows.
    public List<UserManagementRequestResponse> getRequests() {
        if (scopeService.isSystemAdmin()) {
            return requestRepository.findAllByOrderByCreatedAtDesc().stream().map(this::mapToResponse).toList();
        } else {
            UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
            return requestRepository.findByAgencyIdOrderByCreatedAtDesc(agencyId).stream().map(this::mapToResponse).toList();
        }
    }

    @Transactional
    public UserManagementRequestResponse submitRequest(CreateUserManagementRequest request) {
        UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
        UUID actorId = scopeService.getCurrentPrincipal().getId();

        UUID requestId = UUID.randomUUID();
        UserManagementRequestEntity entity = new UserManagementRequestEntity(
            requestId,
            request.requestType(),
            request.targetUserId(),
            agencyId,
            request.reason(),
            request.effectiveDate(),
            actorId
        );
        requestRepository.save(entity);

        auditService.logAction(actorId, "USER_MANAGEMENT_REQUEST_CREATED", "USER_MANAGEMENT_REQUEST", requestId, agencyId, "Submitted user management request: " + request.requestType(), null, null);

        return mapToResponse(entity);
    }

    // System Admin approval applies the new Agency email immediately and invalidates all existing authentication sessions for that user.
    @Transactional
    public UserManagementRequestResponse approveRequest(UUID requestId) {
        UserManagementRequestEntity entity = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + requestId));

        if (!"PENDING".equals(entity.getStatus())) {
            throw new IllegalStateException("Request is not in PENDING status.");
        }

        UUID reviewerId = scopeService.getCurrentPrincipal().getId();
        AdminUserEntity targetUser = userRepository.findById(entity.getTargetUserId())
            .orElseThrow(() -> new ResourceNotFoundException("Target user not found: " + entity.getTargetUserId()));

        if ("EMAIL_CHANGE".equalsIgnoreCase(entity.getRequestType())) {
            String requestedEmail = parseRequestedEmailFromReason(entity.getReason());
            if (requestedEmail == null || requestedEmail.isBlank()) {
                throw new IllegalStateException("Unable to resolve requested target email address from request.");
            }

            String normalizedRequestedEmail = requestedEmail.trim().toLowerCase();

            // Re-verify email availability at approval time
            if (userRepository.existsByEmailIgnoreCase(normalizedRequestedEmail) && !normalizedRequestedEmail.equalsIgnoreCase(targetUser.getEmail())) {
                throw new IllegalStateException("EMAIL_ALREADY_IN_USE: The requested email address " + normalizedRequestedEmail + " is already in use by another account.");
            }

            String oldEmail = targetUser.getEmail();
            targetUser.setEmail(normalizedRequestedEmail);
            targetUser.setUpdatedAt(LocalDateTime.now());
            userRepository.save(targetUser);

            // Preserve immutable email history record
            StaffEmailHistoryEntity history = new StaffEmailHistoryEntity(
                UUID.randomUUID(),
                targetUser.getId(),
                oldEmail,
                normalizedRequestedEmail,
                "APPROVED_REQUEST",
                entity.getId(),
                reviewerId,
                entity.getReason(),
                entity.getCreatedAt(),
                LocalDateTime.now()
            );
            emailHistoryRepository.save(history);

            // Invalidate affected user's existing authenticated sessions/tokens server-side
            refreshTokenRepository.deleteByUserId(targetUser.getId());

            entity.setStatus("APPROVED");
            entity.setReviewedBy(reviewerId);
            entity.setReviewedAt(LocalDateTime.now());
            requestRepository.save(entity);

            auditService.logAction(reviewerId, "EMAIL_CHANGE_APPROVED", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(),
                "Approved email change for user " + targetUser.getId() + " from " + oldEmail + " to " + normalizedRequestedEmail, null, null);
            auditService.logAction(reviewerId, "STAFF_EMAIL_CHANGED", "ADMIN_USER", targetUser.getId(), entity.getAgencyId(),
                "Updated email for user " + targetUser.getId() + " to " + normalizedRequestedEmail + " upon System Admin approval", null, null);

        } else {
            entity.setStatus("APPROVED");
            entity.setReviewedBy(reviewerId);
            entity.setReviewedAt(LocalDateTime.now());
            requestRepository.save(entity);

            userService.deactivateUser(entity.getTargetUserId());

            auditService.logAction(reviewerId, "USER_MANAGEMENT_REQUEST_APPROVED", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(),
                "Approved user deactivation request for " + entity.getTargetUserId(), null, null);
        }

        return mapToResponse(entity);
    }

    @Transactional
    public UserManagementRequestResponse rejectRequest(UUID requestId, String rejectionReason) {
        UserManagementRequestEntity entity = requestRepository.findById(requestId)
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

        auditService.logAction(reviewerId, "USER_MANAGEMENT_REQUEST_REJECTED", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(), "Rejected user management request: " + rejectionReason, null, null);

        return mapToResponse(entity);
    }

    private String parseRequestedEmailFromReason(String reasonStr) {
        if (reasonStr == null) return null;
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("(?i)requested\\s+new\\s+email:\\s*([^\\s\\)]+)")
            .matcher(reasonStr);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        if (reasonStr.contains("(Requested New Email: ") && reasonStr.contains(")")) {
            int start = reasonStr.indexOf("(Requested New Email: ") + "(Requested New Email: ".length();
            int end = reasonStr.indexOf(")", start);
            if (start < end) {
                return reasonStr.substring(start, end).trim();
            }
        }
        return null;
    }

    private UserManagementRequestResponse mapToResponse(UserManagementRequestEntity entity) {
        AdminUserEntity targetUser = userRepository.findById(entity.getTargetUserId()).orElse(null);
        String targetUserEmail = targetUser != null ? targetUser.getEmail() : "Unknown";
        String targetUserName = targetUser != null ? targetUser.getFirstName() + " " + targetUser.getLastName() : "Unknown";
        String agencyName = agencyRepository.findById(entity.getAgencyId()).map(AgencyEntity::getName).orElse(null);
        String requestedEmail = "EMAIL_CHANGE".equalsIgnoreCase(entity.getRequestType()) ? parseRequestedEmailFromReason(entity.getReason()) : null;

        return new UserManagementRequestResponse(
            entity.getId(),
            entity.getRequestType(),
            entity.getTargetUserId(),
            targetUserEmail,
            requestedEmail,
            targetUserName,
            entity.getAgencyId(),
            agencyName,
            entity.getReason(),
            entity.getEffectiveDate(),
            entity.getStatus(),
            entity.getRequestedBy(),
            entity.getReviewedBy(),
            entity.getReviewedAt(),
            entity.getRejectionReason(),
            entity.getCreatedAt()
        );
    }
}
