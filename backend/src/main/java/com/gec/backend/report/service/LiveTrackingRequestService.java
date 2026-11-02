package com.gec.backend.report.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.report.dto.*;
import com.gec.backend.report.entity.*;
import com.gec.backend.report.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Creates a consent request without starting location collection; live
 * tracking begins only after the originating citizen accepts.
 */
@Service
public class LiveTrackingRequestService {

    private final LiveTrackingRequestRepository requestRepository;
    private final IncidentReportRepository reportRepository;
    private final ReportAssignmentRepository assignmentRepository;
    private final AgencyRepository agencyRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public LiveTrackingRequestService(
        LiveTrackingRequestRepository requestRepository,
        IncidentReportRepository reportRepository,
        ReportAssignmentRepository assignmentRepository,
        AgencyRepository agencyRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.requestRepository = requestRepository;
        this.reportRepository = reportRepository;
        this.assignmentRepository = assignmentRepository;
        this.agencyRepository = agencyRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    // Creates a pending live tracking request sent to the citizen without starting location collection.
    @Transactional
    public LiveTrackingRequestResponseDto requestLiveTracking(CreateLiveTrackingRequestDto requestDto) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        if (principal == null) {
            throw new AccessDeniedException("Staff authentication required.");
        }

        IncidentReportEntity report = reportRepository.findById(requestDto.reportId())
            .orElseThrow(() -> new ResourceNotFoundException("Incident report not found: " + requestDto.reportId()));

        UUID agencyId = principal.getAgencyId();
        if (agencyId == null && !scopeService.isSystemAdmin()) {
            throw new AccessDeniedException("Staff agency scope required.");
        }

        UUID effectiveAgencyId = agencyId != null ? agencyId : report.getCategoryId();

        UUID requestId = UUID.randomUUID();
        LiveTrackingRequestEntity entity = new LiveTrackingRequestEntity(
            requestId,
            report.getId(),
            principal.getId(),
            effectiveAgencyId,
            requestDto.reason() != null ? requestDto.reason() : "Operational staff requested live location sharing for response coordination."
        );

        requestRepository.save(entity);

        auditService.logAction(principal.getId(), "LIVE_TRACKING_REQUESTED", "INCIDENT_REPORT", report.getId(), effectiveAgencyId,
            "Requested live location for report " + report.getPublicReference(), null, null);

        return toResponse(entity);
    }

    // Updates request state when citizen accepts or declines live tracking.
    @Transactional
    public LiveTrackingRequestResponseDto respondToLiveTrackingRequest(UUID requestId, String action) {
        LiveTrackingRequestEntity entity = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Live tracking request not found: " + requestId));

        String newStatus = "ACCEPT".equalsIgnoreCase(action) ? "ACCEPTED" : "DECLINED";
        entity.setStatus(newStatus);
        entity.setRespondedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());

        requestRepository.save(entity);

        return toResponse(entity);
    }

    public List<LiveTrackingRequestResponseDto> getRequestsForReport(UUID reportId) {
        return requestRepository.findByReportIdOrderByRequestedAtDesc(reportId).stream().map(this::toResponse).toList();
    }

    private LiveTrackingRequestResponseDto toResponse(LiveTrackingRequestEntity entity) {
        return new LiveTrackingRequestResponseDto(
            entity.getId(),
            entity.getReportId(),
            entity.getRequestedByStaffId(),
            entity.getRequestedByAgencyId(),
            entity.getReason(),
            entity.getStatus(),
            entity.getRequestedAt(),
            entity.getExpiresAt(),
            entity.getRespondedAt()
        );
    }
}
