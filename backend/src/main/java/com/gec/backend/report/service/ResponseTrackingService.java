package com.gec.backend.report.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.report.dto.*;
import com.gec.backend.report.entity.*;
import com.gec.backend.report.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Uses the designated Response Lead's device as the temporary live location
 * source for the assigned appliance until dedicated vehicle GPS is available.
 */
@Service
public class ResponseTrackingService {

    private final ResponseInvitationRepository invitationRepository;
    private final ResponseTrackingSessionRepository sessionRepository;
    private final ResponseLocationPointRepository pointRepository;
    private final ReportAssignmentRepository assignmentRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public ResponseTrackingService(
        ResponseInvitationRepository invitationRepository,
        ResponseTrackingSessionRepository sessionRepository,
        ResponseLocationPointRepository pointRepository,
        ReportAssignmentRepository assignmentRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.invitationRepository = invitationRepository;
        this.sessionRepository = sessionRepository;
        this.pointRepository = pointRepository;
        this.assignmentRepository = assignmentRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    // Creates a secure response invitation for the designated Response Lead and assigns the appliance to the report assignment.
    @Transactional
    public ResponseInvitationResponseDto createResponseInvitation(CreateResponseInvitationDto dto) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        if (principal == null) {
            throw new AccessDeniedException("Staff authentication required.");
        }

        ReportAssignmentEntity assignment = assignmentRepository.findById(dto.reportAssignmentId())
            .orElseThrow(() -> new ResourceNotFoundException("Report assignment not found: " + dto.reportAssignmentId()));

        if (dto.assignedApplianceId() != null) {
            assignment.setAssignedApplianceId(dto.assignedApplianceId());
        }
        assignment.setResponseLeadStaffUserId(dto.responseLeadStaffUserId());
        assignment.setUpdatedAt(LocalDateTime.now());
        assignmentRepository.save(assignment);

        String rawToken = generateRawToken();
        String tokenHash = hashToken(rawToken);

        int durationMins = dto.durationMinutes() != null && dto.durationMinutes() > 0 ? dto.durationMinutes() : 1440;
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(durationMins);

        UUID invitationId = UUID.randomUUID();
        ResponseInvitationEntity invitation = new ResponseInvitationEntity(
            invitationId,
            assignment.getId(),
            dto.responseLeadStaffUserId(),
            tokenHash,
            principal.getId(),
            expiresAt
        );

        invitationRepository.save(invitation);

        auditService.logAction(principal.getId(), "RESPONSE_LEAD_ASSIGNED", "REPORT_ASSIGNMENT", assignment.getId(), assignment.getAgencyId(),
            "Assigned Response Lead " + dto.responseLeadStaffUserId() + " to assignment " + assignment.getId(), null, null);

        String shareUrl = "/response-share/" + rawToken;

        return new ResponseInvitationResponseDto(
            invitation.getId(),
            invitation.getReportAssignmentId(),
            invitation.getResponseLeadStaffUserId(),
            rawToken,
            shareUrl,
            invitation.getStatus(),
            invitation.getCreatedAt(),
            invitation.getExpiresAt(),
            invitation.getAcceptedAt()
        );
    }

    // Accepts a response invitation when the Response Lead opens the assignment on Agency Android.
    @Transactional
    public ResponseTrackingSessionResponseDto acceptResponseInvitation(String rawToken) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        if (principal == null) {
            throw new AccessDeniedException("Staff authentication required.");
        }

        String tokenHash = hashToken(rawToken);
        ResponseInvitationEntity invitation = invitationRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new ResourceNotFoundException("Response invitation token not found or expired."));

        if ("REVOKED".equalsIgnoreCase(invitation.getStatus()) || invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResourceNotFoundException("Response invitation has expired or been revoked.");
        }

        invitation.setStatus("ACCEPTED");
        invitation.setAcceptedAt(LocalDateTime.now());
        invitationRepository.save(invitation);

        ReportAssignmentEntity assignment = assignmentRepository.findById(invitation.getReportAssignmentId())
            .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + invitation.getReportAssignmentId()));

        Optional<ResponseTrackingSessionEntity> activeOpt = sessionRepository.findByReportAssignmentIdAndStatus(assignment.getId(), "ACTIVE");
        ResponseTrackingSessionEntity session;
        if (activeOpt.isPresent()) {
            session = activeOpt.get();
        } else {
            session = new ResponseTrackingSessionEntity(
                UUID.randomUUID(),
                assignment.getId(),
                assignment.getAssignedApplianceId(),
                principal.getId()
            );
            sessionRepository.save(session);
        }

        return toSessionResponse(session);
    }

    // Appends a new live location point for the active response tracking session.
    @Transactional
    public void recordResponseLocationPoint(UUID sessionId, LocationPointRequest request) {
        ResponseTrackingSessionEntity session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Response tracking session not found: " + sessionId));

        if (!"ACTIVE".equals(session.getStatus())) {
            throw new IllegalStateException("Response tracking session is no longer active: " + session.getStatus());
        }

        LocalDateTime captured = request.capturedAt() != null ? request.capturedAt() : LocalDateTime.now();

        ResponseLocationPointEntity point = new ResponseLocationPointEntity(
            UUID.randomUUID(),
            sessionId,
            request.latitude(),
            request.longitude(),
            request.accuracyMeters(),
            captured
        );

        pointRepository.save(point);

        session.setLastLocationAt(captured);
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepository.save(session);
    }

    // Stops active response tracking for an assignment.
    @Transactional
    public ResponseTrackingSessionResponseDto stopResponseTracking(UUID sessionId) {
        ResponseTrackingSessionEntity session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Response tracking session not found: " + sessionId));

        session.setStatus("COMPLETED");
        session.setEndedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());

        sessionRepository.save(session);

        return toSessionResponse(session);
    }

    public ResponseTrackingSessionResponseDto getActiveResponseSession(UUID reportAssignmentId) {
        Optional<ResponseTrackingSessionEntity> activeOpt = sessionRepository.findByReportAssignmentIdAndStatus(reportAssignmentId, "ACTIVE");
        return activeOpt.map(this::toSessionResponse).orElse(null);
    }

    private ResponseTrackingSessionResponseDto toSessionResponse(ResponseTrackingSessionEntity entity) {
        Double lat = null;
        Double lon = null;
        Double accuracy = null;

        Optional<ResponseLocationPointEntity> latestPointOpt = pointRepository.findTopBySessionIdOrderByCapturedAtDesc(entity.getId());
        if (latestPointOpt.isPresent()) {
            ResponseLocationPointEntity pt = latestPointOpt.get();
            lat = pt.getLatitude();
            lon = pt.getLongitude();
            accuracy = pt.getAccuracyMeters();
        }

        return new ResponseTrackingSessionResponseDto(
            entity.getId(),
            entity.getReportAssignmentId(),
            entity.getAssignedApplianceId(),
            entity.getResponseLeadStaffUserId(),
            entity.getTrackingSource(),
            entity.getStatus(),
            entity.getStartedAt(),
            entity.getLastLocationAt(),
            lat,
            lon,
            accuracy
        );
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return rawToken;
        }
    }
}
