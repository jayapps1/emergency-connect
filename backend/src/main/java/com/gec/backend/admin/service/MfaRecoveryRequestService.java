package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.UserManagementRequestResponse;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.entity.RoleEntity;
import com.gec.backend.admin.entity.UserManagementRequestEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.repository.UserManagementRequestRepository;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.messaging.service.StaffNotificationService;
import com.gec.backend.common.exception.ResourceConflictException;
import com.gec.backend.common.exception.ResourceNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MfaRecoveryRequestService {

    private final UserManagementRequestRepository requestRepository;
    private final AdminUserRepository userRepository;
    private final UserManagementRequestService userRequestService;
    private final MfaService mfaService;
    private final AdminScopeService scopeService;
    private final PasswordEncoder passwordEncoder;
    private final StaffNotificationService notificationService;
    private final AuditService auditService;

    public MfaRecoveryRequestService(
        UserManagementRequestRepository requestRepository,
        AdminUserRepository userRepository,
        UserManagementRequestService userRequestService,
        MfaService mfaService,
        AdminScopeService scopeService,
        PasswordEncoder passwordEncoder,
        StaffNotificationService notificationService,
        AuditService auditService
    ) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.userRequestService = userRequestService;
        this.mfaService = mfaService;
        this.scopeService = scopeService;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    @Transactional
    public UserManagementRequestResponse submitRecoveryRequest(UUID userId, String reason) {
        AdminUserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        // Check if user already has an active recovery request awaiting agency verification, system approval, or collection
        List<String> activeStatuses = List.of("PENDING_AGENCY_VERIFICATION", "PENDING_SYSTEM_APPROVAL", "APPROVED_AWAITING_COLLECTION");
        var activeOpt = requestRepository.findTopByRequestedByAndRequestTypeAndStatusInOrderByCreatedAtDesc(userId, "MFA_RECOVERY_CODE_REISSUE", activeStatuses);

        if (activeOpt.isPresent()) {
            throw new ResourceConflictException("MFA_RECOVERY_REQUEST_ALREADY_PENDING: You already have an active 2FA recovery code request.");
        }

        UUID agencyId = user.getAgencyId() != null ? user.getAgencyId() : UUID.randomUUID();
        UUID requestId = UUID.randomUUID();

        // Check exact role membership: AGENCY_ADMIN requests bypass agency verification and go directly to PENDING_SYSTEM_APPROVAL
        boolean isAgencyAdmin = user.getRoles() != null && user.getRoles().stream()
            .map(RoleEntity::getCode)
            .anyMatch(code -> "AGENCY_ADMIN".equalsIgnoreCase(code) || "ROLE_AGENCY_ADMIN".equalsIgnoreCase(code));

        UserManagementRequestEntity entity = new UserManagementRequestEntity(
            requestId,
            "MFA_RECOVERY_CODE_REISSUE",
            userId,
            agencyId,
            reason != null && !reason.isBlank() ? reason.trim() : "Staff 2FA recovery codes re-issuance request",
            null,
            userId
        );

        String targetUrl = "/my-requests?requestId=" + requestId;

        if (isAgencyAdmin) {
            entity.setStatus("PENDING_SYSTEM_APPROVAL");
            notificationService.sendNotification(userId, "2FA Recovery Request Submitted",
                "Your recovery request has been submitted and forwarded directly to System Administration for approval.", "2FA_RECOVERY", targetUrl);
        } else {
            entity.setStatus("PENDING_AGENCY_VERIFICATION");
            notificationService.sendNotification(userId, "2FA Recovery Request Submitted",
                "Your recovery request has been submitted and is awaiting verification from your Agency Administrator.", "2FA_RECOVERY", targetUrl);
        }

        requestRepository.save(entity);

        auditService.logAction(userId, "MFA_RECOVERY_REQUESTED", "USER_MANAGEMENT_REQUEST", requestId, agencyId,
            "Submitted 2FA recovery code re-issuance request with initial status: " + entity.getStatus(), null, null);

        return userRequestService.mapToResponse(entity);
    }

    @Transactional
    public UserManagementRequestResponse submitAssistedRecoveryRequest(UUID agencyAdminId, UUID targetUserId, String verificationMethod, String verificationNotes, String reason) {
        if (targetUserId.equals(agencyAdminId)) {
            throw new IllegalStateException("AGENCY_ADMIN_CANNOT_VERIFY_SELF: Agency Administrators cannot initiate assisted recovery for themselves.");
        }

        AdminUserEntity targetUser = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Target staff user not found: " + targetUserId));

        if (!scopeService.isSystemAdmin()) {
            scopeService.validateAgencyScope(targetUser.getAgencyId());
        }

        List<String> activeStatuses = List.of("PENDING_AGENCY_VERIFICATION", "PENDING_SYSTEM_APPROVAL", "APPROVED_AWAITING_COLLECTION");
        var activeOpt = requestRepository.findTopByRequestedByAndRequestTypeAndStatusInOrderByCreatedAtDesc(targetUserId, "MFA_RECOVERY_CODE_REISSUE", activeStatuses);

        if (activeOpt.isPresent()) {
            throw new ResourceConflictException("MFA_RECOVERY_REQUEST_ALREADY_PENDING: An active 2FA recovery request already exists for this staff account.");
        }

        UUID requestId = UUID.randomUUID();
        UserManagementRequestEntity entity = new UserManagementRequestEntity(
            requestId,
            "MFA_RECOVERY_CODE_REISSUE",
            targetUserId,
            targetUser.getAgencyId(),
            reason != null && !reason.isBlank() ? reason.trim() : "Assisted 2FA recovery code re-issuance initiated by Agency Administrator",
            null,
            agencyAdminId
        );
        entity.setStatus("PENDING_SYSTEM_APPROVAL"); // Agency Admin verified identity during assisted in-person initiation
        entity.setAgencyVerifiedBy(agencyAdminId);
        entity.setAgencyVerifiedAt(LocalDateTime.now());
        entity.setAgencyVerificationMethod(verificationMethod != null && !verificationMethod.isBlank() ? verificationMethod.trim() : "IN_PERSON_VERIFICATION");
        entity.setAgencyVerificationNotes(verificationNotes != null && !verificationNotes.isBlank() ? verificationNotes.trim() : "Assisted in-person identity verification by Agency Administrator");
        requestRepository.save(entity);

        auditService.logAction(agencyAdminId, "MFA_RECOVERY_REQUESTED", "USER_MANAGEMENT_REQUEST", requestId, targetUser.getAgencyId(),
            "Initiated assisted 2FA recovery request on behalf of locked-out staff user " + targetUserId, null, null);
        auditService.logAction(agencyAdminId, "MFA_RECOVERY_AGENCY_VERIFIED", "USER_MANAGEMENT_REQUEST", requestId, targetUser.getAgencyId(),
            "Verified staff identity via " + entity.getAgencyVerificationMethod(), null, null);

        notificationService.sendNotification(targetUserId, "Assisted 2FA Recovery Initiated",
            "An assisted 2FA recovery request was initiated on your behalf by your Agency Administrator and forwarded to System Administration.", "2FA_RECOVERY", "/my-requests?requestId=" + requestId);

        return userRequestService.mapToResponse(entity);
    }

    @Transactional
    public UserManagementRequestResponse withdrawRecoveryRequest(UUID requestId, UUID userId) {
        UserManagementRequestEntity entity = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Recovery request not found: " + requestId));

        if (!entity.getTargetUserId().equals(userId) && !entity.getRequestedBy().equals(userId)) {
            throw new BadCredentialsException("Only the original requester or target user can withdraw their request.");
        }

        if ("APPROVED_AWAITING_COLLECTION".equalsIgnoreCase(entity.getStatus()) || "COMPLETED".equalsIgnoreCase(entity.getStatus())) {
            throw new ResourceConflictException("RECOVERY_REQUEST_NOT_WITHDRAWABLE: Recovery request has already been approved and cannot be withdrawn.");
        }

        if (!entity.getStatus().startsWith("PENDING")) {
            throw new IllegalStateException("Request cannot be withdrawn in status: " + entity.getStatus());
        }

        entity.setStatus("WITHDRAWN");
        entity.setUpdatedAt(LocalDateTime.now());
        requestRepository.save(entity);

        auditService.logAction(userId, "MFA_RECOVERY_REQUEST_WITHDRAWN", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(),
            "Requester withdrawn 2FA recovery request", null, null);

        notificationService.sendNotification(userId, "2FA Recovery Request Withdrawn",
            "Your 2FA recovery request has been withdrawn successfully.", "2FA_RECOVERY", "/my-requests?requestId=" + requestId);

        return userRequestService.mapToResponse(entity);
    }

    @Transactional
    public UserManagementRequestResponse agencyVerifyAndForward(UUID requestId, UUID agencyAdminId, String verificationMethod, String verificationNotes) {
        UserManagementRequestEntity entity = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Recovery request not found: " + requestId));

        if (!"MFA_RECOVERY_CODE_REISSUE".equalsIgnoreCase(entity.getRequestType())) {
            throw new IllegalArgumentException("Request is not a 2FA recovery request.");
        }

        if (!"PENDING_AGENCY_VERIFICATION".equalsIgnoreCase(entity.getStatus())) {
            throw new IllegalStateException("Request is not in PENDING_AGENCY_VERIFICATION status.");
        }

        // Anti-Self-Verification Constraint
        if (entity.getTargetUserId().equals(agencyAdminId)) {
            throw new IllegalStateException("AGENCY_ADMIN_CANNOT_VERIFY_SELF: Agency Administrators cannot verify their own recovery request.");
        }

        scopeService.validateAgencyScope(entity.getAgencyId());

        entity.setStatus("PENDING_SYSTEM_APPROVAL");
        entity.setAgencyVerifiedBy(agencyAdminId);
        entity.setAgencyVerifiedAt(LocalDateTime.now());
        entity.setAgencyVerificationMethod(verificationMethod != null && !verificationMethod.isBlank() ? verificationMethod.trim() : "OFFICIAL_ID_CHECK");
        entity.setAgencyVerificationNotes(verificationNotes != null ? verificationNotes.trim() : "Identity verified by Agency Administrator");
        entity.setUpdatedAt(LocalDateTime.now());
        requestRepository.save(entity);

        auditService.logAction(agencyAdminId, "MFA_RECOVERY_AGENCY_VERIFIED", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(),
            "Agency Administrator verified staff identity using method: " + entity.getAgencyVerificationMethod(), null, null);
        auditService.logAction(agencyAdminId, "MFA_RECOVERY_FORWARDED", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(),
            "Forwarded 2FA recovery request to System Administration for final approval", null, null);

        notificationService.sendNotification(entity.getTargetUserId(), "Agency Verification Completed",
            "Your 2FA recovery request has been verified by your Agency Administrator and forwarded to System Administration.", "2FA_RECOVERY", "/my-requests?requestId=" + requestId);

        return userRequestService.mapToResponse(entity);
    }

    @Transactional
    public UserManagementRequestResponse systemApproveRecovery(UUID requestId, UUID sysAdminId) {
        if (!scopeService.isSystemAdmin()) {
            throw new IllegalStateException("Access restricted to System Administrators.");
        }

        UserManagementRequestEntity entity = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Recovery request not found: " + requestId));

        if (!"MFA_RECOVERY_CODE_REISSUE".equalsIgnoreCase(entity.getRequestType())) {
            throw new IllegalArgumentException("Request is not a 2FA recovery request.");
        }

        if (!"PENDING_SYSTEM_APPROVAL".equalsIgnoreCase(entity.getStatus()) && !"PENDING_AGENCY_VERIFICATION".equalsIgnoreCase(entity.getStatus())) {
            throw new IllegalStateException("Request is not awaiting approval.");
        }

        // Anti-Self-Approval Constraint
        if (entity.getTargetUserId().equals(sysAdminId)) {
            throw new IllegalStateException("SYSTEM_ADMIN_CANNOT_APPROVE_SELF: System Administrators cannot approve recovery requests for their own account.");
        }

        String collectionToken = UUID.randomUUID().toString();

        entity.setStatus("APPROVED_AWAITING_COLLECTION");
        entity.setReviewedBy(sysAdminId);
        entity.setReviewedAt(LocalDateTime.now());
        entity.setCollectionToken(collectionToken);
        entity.setCollectionTokenExpiresAt(LocalDateTime.now().plusHours(24));
        entity.setUpdatedAt(LocalDateTime.now());
        requestRepository.save(entity);

        auditService.logAction(sysAdminId, "MFA_RECOVERY_SYSTEM_APPROVED", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(),
            "Approved 2FA recovery request; authorized secure collection token with 24-hour expiration", null, null);

        notificationService.sendNotification(entity.getTargetUserId(), "2FA Recovery Request Approved",
            "Your 2FA recovery code request has been approved by System Administration. Complete identity verification to securely collect your new recovery codes.", "2FA_RECOVERY", "/my-requests?requestId=" + requestId);

        return userRequestService.mapToResponse(entity);
    }

    @Transactional
    public UserManagementRequestResponse rejectRecoveryRequest(UUID requestId, UUID reviewerId, String rejectionReason) {
        UserManagementRequestEntity entity = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Recovery request not found: " + requestId));

        if (!"MFA_RECOVERY_CODE_REISSUE".equalsIgnoreCase(entity.getRequestType())) {
            throw new IllegalArgumentException("Request is not a 2FA recovery request.");
        }

        boolean isSysAdmin = scopeService.isSystemAdmin();
        if (!isSysAdmin) {
            scopeService.validateAgencyScope(entity.getAgencyId());
        }

        entity.setStatus(isSysAdmin ? "REJECTED_BY_SYSTEM_ADMIN" : "REJECTED_BY_AGENCY");
        entity.setReviewedBy(reviewerId);
        entity.setReviewedAt(LocalDateTime.now());
        entity.setRejectionReason(rejectionReason != null && !rejectionReason.isBlank() ? rejectionReason.trim() : "Recovery request rejected.");
        entity.setUpdatedAt(LocalDateTime.now());
        requestRepository.save(entity);

        auditService.logAction(reviewerId, "MFA_RECOVERY_REJECTED", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(),
            "Rejected 2FA recovery request: " + entity.getRejectionReason(), null, null);

        notificationService.sendNotification(entity.getTargetUserId(), "2FA Recovery Request Rejected",
            "Your 2FA recovery request was rejected. Reason: " + entity.getRejectionReason(), "2FA_RECOVERY", "/my-requests?requestId=" + requestId);

        return userRequestService.mapToResponse(entity);
    }

    @Transactional
    public List<String> collectRecoveryCodes(UUID requestId, UUID userId, String password) {
        UserManagementRequestEntity entity = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Recovery request not found: " + requestId));

        if (!entity.getTargetUserId().equals(userId)) {
            throw new BadCredentialsException("Recovery request does not belong to current user.");
        }

        if (!"APPROVED_AWAITING_COLLECTION".equalsIgnoreCase(entity.getStatus())) {
            throw new IllegalStateException("Recovery request is not in APPROVED_AWAITING_COLLECTION status.");
        }

        if (entity.getCollectionTokenExpiresAt() != null && LocalDateTime.now().isAfter(entity.getCollectionTokenExpiresAt())) {
            entity.setStatus("EXPIRED");
            entity.setUpdatedAt(LocalDateTime.now());
            requestRepository.save(entity);

            auditService.logAction(userId, "MFA_RECOVERY_REQUEST_EXPIRED", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(),
                "Collection token expired prior to recovery code collection", null, null);
            throw new IllegalStateException("MFA_RECOVERY_TOKEN_EXPIRED: Recovery collection token has expired.");
        }

        AdminUserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (password == null || password.isBlank() || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect. Secure collection failed.");
        }

        // Re-uses existing secure recovery-code generator; invalidates old codes and saves hashed new codes
        List<String> plaintextCodes = mfaService.generateAndSaveRecoveryCodes("ADMIN", userId);

        entity.setStatus("COMPLETED");
        entity.setCollectedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        requestRepository.save(entity);

        auditService.logAction(userId, "MFA_RECOVERY_CODES_REISSUED", "ADMIN_USER", userId, entity.getAgencyId(),
            "Invalidated previous recovery codes and generated 10 new codes upon authorized collection", null, null);
        auditService.logAction(userId, "MFA_RECOVERY_CODES_COLLECTED", "USER_MANAGEMENT_REQUEST", requestId, entity.getAgencyId(),
            "Successfully collected newly re-issued 2FA recovery codes", null, null);

        notificationService.sendNotification(userId, "Recovery Codes Reissued",
            "Your replacement 2FA recovery codes have been generated and collected successfully.", "2FA_RECOVERY", "/my-requests?requestId=" + requestId);

        return plaintextCodes;
    }
}
